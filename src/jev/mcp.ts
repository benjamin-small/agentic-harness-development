import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { Ajv } from "ajv";
import { createJevClient } from "./client.js";
import { decideBatch } from "./batch.js";
import {
  evidenceRelevance,
  findingSupport,
  type EvidenceInput,
  type FindingInput,
} from "./recipes.js";
import {
  OUTCOME_REASONS,
  recordJevOutcome,
  type JevOutcome,
} from "./logging.js";
import {
  JevError,
  JEV_MODEL,
  error,
  integer,
  type ClientOptions,
  type DecisionResult,
  type DecisionRequest,
} from "./types.js";
import { validateRequest } from "./validation.js";

export const DATA_SCOPES = ["public", "synthetic", "private"] as const;
export type DataScope = (typeof DATA_SCOPES)[number];
const string = { type: "string", minLength: 1, maxLength: 16_000 };
const id = { type: "string", pattern: "^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$" };
function object(
  properties: Record<string, object>,
  required = Object.keys(properties),
) {
  return {
    type: "object" as const,
    properties,
    required,
    additionalProperties: false,
  };
}
const scope = {
  type: "string",
  enum: DATA_SCOPES,
  description:
    "Declared data classification, not a permission grant. Send only provider-authorized data.",
};
const inference = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: true,
};
export const JEV_TOOLS: Tool[] = [
  {
    name: "jev_evidence_relevance",
    description:
      "Triage supplied excerpts against a task objective before loading more context or preparing a handoff. Returns relevant/irrelevant/uncertain for each ID. Keep uncertain excerpts and original evidence. Use for semantic relevance; use local search for exact matches. Sends supplied text to OpenRouter; may incur charges.",
    annotations: inference,
    inputSchema: object({
      dataScope: scope,
      id,
      objective: string,
      items: {
        type: "array",
        minItems: 1,
        maxItems: 32,
        items: object({ id, text: string }),
      },
    }),
  },
  {
    name: "jev_finding_support",
    description:
      "Check whether supplied evidence supports candidate review findings before finalizing a review. Returns supported/contradicted/insufficient per ID. Verify evidence yourself; this is not an approval or final verdict. Sends supplied text to OpenRouter; may incur charges.",
    annotations: inference,
    inputSchema: object({
      dataScope: scope,
      id,
      findings: {
        type: "array",
        minItems: 1,
        maxItems: 32,
        items: object({ id, claim: string, evidence: string }),
      },
    }),
  },
  {
    name: "jev_decide",
    description:
      "Make a bounded choice, rubric score, or proposition check over supplied state, e.g. routing or classifying evidence. Batch independent questions sharing state. Use deterministic code for exact checks and the main model for prose. Sends state to OpenRouter; may incur charges.",
    annotations: inference,
    inputSchema: object({
      dataScope: scope,
      request: object({
        id,
        state: {},
        questions: {
          type: "object",
          minProperties: 1,
          maxProperties: 64,
          additionalProperties: { type: "object" },
        },
      }),
    }),
  },
  {
    name: "jev_batch",
    description:
      "Evaluate 1..8 independent Jev requests with separate states, at most two concurrent provider calls. Preserves sequence, callId, successes and failures; never repeat a partial batch blindly. Sends state to OpenRouter; may incur charges.",
    annotations: inference,
    inputSchema: object({
      dataScope: scope,
      requests: {
        type: "array",
        minItems: 1,
        maxItems: 8,
        items: { type: "object" },
      },
    }),
  },
  {
    name: "jev_status",
    description:
      "Inspect local Jev configuration and availability without calling the provider. Does not prove credentials or network work.",
    annotations: { readOnlyHint: true, openWorldHint: false },
    inputSchema: object({}),
  },
  {
    name: "jev_record_outcome",
    description:
      "Record whether a Jev answer was used, overridden, or unavailable. Supply the returned callId for completed calls. Caller-reported usefulness, not measured accuracy. No provider call; no free text logged.",
    annotations: {
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: object(
      {
        callId: { type: "string" },
        outcome: { enum: ["used", "overridden", "unavailable"] },
        reason: { enum: OUTCOME_REASONS },
      },
      ["outcome", "reason"],
    ),
  },
];
export interface JevServerOptions {
  version: string;
  apiKey?: string;
  logPath: string;
  allowedDataScopes?: DataScope[];
  fetch?: typeof globalThis.fetch;
  timeoutMs?: number;
  /** Adapter-wide batch budget; keep below the host tool timeout. */
  batchTimeoutMs?: number;
}
/** Thin stdio-compatible adapter. Configuration is host-owned, never model input. */
export function createJevServer(options: JevServerOptions): Server {
  const batchTimeoutMs = options.batchTimeoutMs ?? 45_000;
  if (!integer(batchTimeoutMs, 1, 50_000))
    throw error("INVALID_CONFIG", "Invalid MCP batch deadline.");
  const allowed = options.allowedDataScopes ?? ["public", "synthetic"];
  if (!allowed.length || allowed.some((value) => !DATA_SCOPES.includes(value)))
    throw error("INVALID_CONFIG", "Invalid allowed Jev data scopes.");
  const client = options.apiKey
    ? createJevClient({
        ...options,
        apiKey: options.apiKey,
        maxRetries: 0,
      } satisfies ClientOptions & JevServerOptions)
    : undefined;
  const ajv = new Ajv({ strict: false });
  const validators = new Map(
    JEV_TOOLS.map((tool) => [tool.name, ajv.compile(tool.inputSchema)]),
  );
  const completed = new Map<string, boolean>();
  let busy = false;
  const lifetime = new AbortController();
  const server = new Server(
    { name: "jev", version: options.version },
    {
      capabilities: { tools: {} },
      instructions:
        "Use Jev for suitable bounded structured judgments. Authorization and final judgment remain with the host. No call is needed merely to demonstrate usage.",
    },
  );
  server.onclose = () => lifetime.abort();
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: JEV_TOOLS,
  }));
  const remember = (result: DecisionResult) => {
    if (result.callId) completed.set(result.callId, result.ok);
    if (completed.size > 1024) completed.delete(completed.keys().next().value!);
    return result;
  };
  const reply = (value: Record<string, unknown>, isError = false) => ({
    content: [{ type: "text" as const, text: JSON.stringify(value) }],
    structuredContent: value,
    isError,
  });
  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const name = request.params.name;
    const args = request.params.arguments ?? {};
    let admitted = false;
    try {
      if (!validators.get(name)?.(args))
        throw error("INVALID_INPUT", "Unknown tool or invalid tool arguments.");
      if (name === "jev_status")
        return reply({
          configured: Boolean(client),
          liveVerified: false,
          model: JEV_MODEL,
          version: options.version,
          allowedDataScopes: allowed,
          maxRetries: 0,
          batchConcurrency: 2,
          batchTimeoutMs,
          busy,
        });
      if (name === "jev_record_outcome") {
        const outcome = args as unknown as JevOutcome;
        if (
          outcome.callId &&
          (!completed.has(outcome.callId) ||
            (outcome.outcome !== "unavailable" &&
              !completed.get(outcome.callId)))
        )
          throw error(
            "INVALID_INPUT",
            "Outcome needs a matching call from this server session; used/overridden needs a successful call.",
          );
        // Consume before asynchronous persistence. Ambiguous writes must not be replayed.
        if (outcome.callId) completed.delete(outcome.callId);
        const callId = await recordJevOutcome(outcome, options.logPath);
        return reply({ recorded: true, callId });
      }
      if (!allowed.includes(args.dataScope as DataScope))
        return reply(
          { ok: false, unavailable: "data_scope", dispatched: false },
          true,
        );
      if (!client)
        return reply(
          { ok: false, unavailable: "credentials", dispatched: false },
          true,
        );
      if (busy)
        return reply(
          { ok: false, unavailable: "busy", dispatched: false },
          true,
        );
      const recipe =
        name === "jev_evidence_relevance"
          ? evidenceRelevance(args as unknown as EvidenceInput)
          : name === "jev_finding_support"
            ? findingSupport(args as unknown as FindingInput)
            : undefined;
      const inputs: DecisionRequest[] = recipe
        ? [recipe.request]
        : name === "jev_batch"
          ? (args.requests as unknown[]).map(validateRequest)
          : [validateRequest(args.request)];
      busy = admitted = true;
      const deadline =
        name === "jev_batch" ? AbortSignal.timeout(batchTimeoutMs) : undefined;
      const signal = AbortSignal.any([
        extra.signal,
        lifetime.signal,
        ...(deadline ? [deadline] : []),
      ]);
      const metadata = {
        recipe: recipe?.name ?? ("custom" as const),
        recipeVersion: 1 as const,
        surface: "mcp" as const,
      };
      if (name === "jev_batch") {
        const results = [];
        for await (const result of decideBatch(client, inputs, {
          signal,
          metadata,
          concurrency: 2,
        }))
          results.push({ ...remember(result), sequence: result.sequence });
        return reply(
          {
            ok: results.length === inputs.length && results.every((r) => r.ok),
            cancelled: signal.aborted,
            deadlineExpired: deadline?.aborted ?? false,
            results,
            requested: inputs.length,
          },
          results.length !== inputs.length || results.some((r) => !r.ok),
        );
      }
      const result = remember(
        await client.decide(inputs[0], { signal, metadata }),
      );
      return reply(
        {
          ...result,
          ...(recipe
            ? { recipe: recipe.name, recipeVersion: recipe.version }
            : {}),
        },
        !result.ok,
      );
    } catch (cause) {
      const failure =
        cause instanceof JevError
          ? cause
          : error(
              "IO_ERROR",
              "Jev tool failed. A dispatched request may have been billed; do not automatically retry.",
            );
      return reply({ ok: false, error: failure.detail }, true);
    } finally {
      if (admitted) busy = false;
    }
  });
  return server;
}
