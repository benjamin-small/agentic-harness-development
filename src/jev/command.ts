import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import type { Readable, Writable } from "node:stream";
import { createJevClient } from "./client.js";
import { decideBatch } from "./batch.js";
import { readInput, readJsonLines } from "./input.js";
import { validateRequest } from "./validation.js";
import {
  evidenceRelevance,
  findingSupport,
  type EvidenceInput,
  type FindingInput,
} from "./recipes.js";
import { recordJevOutcome, type JevOutcome } from "./logging.js";
import {
  JEV_MODEL,
  JevError,
  error,
  integer,
  type JevClient,
} from "./types.js";

const help = `Usage: jev <decide|batch|validate> --input <file|-> [options]
       jev <evidence-relevance|finding-support|outcome> --input <file|-> [options]
       jev --version

decide     One JSON request; one JSON result on stdout.
batch      JSONL requests; JSONL results in completion order with sequence IDs.
validate   Validate one request locally without credentials or API access.
evidence-relevance  Classify supplied excerpts against an objective (recipe v1).
finding-support    Check supplied evidence for candidate findings (recipe v1).
outcome    Log used/overridden/unavailable locally; no credentials or API call.

Options for decide/batch:
  --timeout-ms <1..300000>     Whole request deadline (default 30000).
  --max-retries <0..5>        Retries after transient HTTP failures (default 2).
  --retry-transport-errors    Also replay ambiguous transport failures (may bill twice).
  --concurrency <1..16>       Batch only (default 4).
  --quiet                     Suppress activity logs; errors still go to stderr.

Every library/CLI call appends to ~/.local/state/poietic-harness/jev/calls.jsonl.
JEV_LOG_PATH overrides the absolute file path. --quiet never disables this log.
Credentials: OPENROUTER_API_KEY environment variable, never a command argument.
Exit codes: 0 success; 1 request/batch/IO failure; 2 usage/setup/validation failure;
130 SIGINT; 143 SIGTERM. Activity logs and diagnostics go to stderr as JSONL.
Activity logs omit credentials and request contents. See docs/jev-runtime.md.
`;

export interface CommandIO {
  stdin: Readable;
  stdout: Writable;
  stderr: Writable;
  apiKey?: string;
  fetch?: typeof globalThis.fetch;
  signal?: AbortSignal;
}
async function write(
  stream: Writable,
  value: unknown,
  raw = false,
): Promise<void> {
  const data = raw ? String(value) : `${JSON.stringify(value)}\n`;
  await new Promise<void>((resolve, reject) =>
    stream.write(data, (cause) => (cause ? reject(cause) : resolve())),
  );
}
export async function runCommand(
  args: string[],
  io: CommandIO,
): Promise<number> {
  let input: Readable | undefined;
  const cancel = () => input?.destroy();
  let setup = true;
  let activityCommand: string | undefined;
  let commandStarted = 0;
  let admitted = 0;
  let completed = 0;
  let quiet = false;
  const activity = async (
    event: string,
    fields: Record<string, string | number> = {},
  ) => {
    if (quiet || activityCommand === undefined) return;
    try {
      await write(io.stderr, {
        schemaVersion: 1,
        event,
        timestamp: new Date().toISOString(),
        command: activityCommand,
        ...fields,
      });
    } catch {
      /* Activity logging is best effort; a closed log pipe does not change decisions. */
    }
  };
  const finish = async (exitCode: number) => {
    await activity("jev.command.finish", {
      exitCode,
      requests: admitted,
      completed,
      elapsedMs: Math.round(performance.now() - commandStarted),
    });
    return exitCode;
  };
  try {
    if (args.length === 1 && args[0] === "--version") {
      const pkg = JSON.parse(
        await readFile(
          new URL("../../../package.json", import.meta.url),
          "utf8",
        ),
      ) as { version: string };
      await write(io.stdout, `${pkg.version}\n`, true);
      return 0;
    }
    if (args.length === 1 && ["--help", "-h"].includes(args[0]!)) {
      await write(io.stdout, help, true);
      return 0;
    }
    const command = args[0];
    if (
      !command ||
      ![
        "decide",
        "batch",
        "validate",
        "evidence-relevance",
        "finding-support",
        "outcome",
      ].includes(command)
    )
      throw error("INVALID_INPUT", "Unknown command; use jev --help.");
    let values: Record<string, string | boolean | undefined>;
    try {
      ({ values } = parseArgs({
        args: args.slice(1),
        strict: true,
        allowPositionals: false,
        options: {
          input: { type: "string" },
          quiet: { type: "boolean" },
          ...(["validate", "outcome"].includes(command)
            ? {}
            : {
                "timeout-ms": { type: "string" },
                "max-retries": { type: "string" },
                "retry-transport-errors": { type: "boolean" },
              }),
          ...(command === "batch"
            ? { concurrency: { type: "string" } as const }
            : {}),
        },
      }));
    } catch {
      throw error(
        "INVALID_INPUT",
        "Invalid command arguments; use jev --help.",
      );
    }
    if (typeof values.input !== "string" || !values.input)
      throw error("INVALID_INPUT", "Provide --input <file|->.");
    quiet = values.quiet === true;
    const numeric = (
      name: string,
      fallback: number,
      min: number,
      max: number,
    ): number => {
      const raw = values[name];
      const value =
        raw === undefined
          ? fallback
          : typeof raw === "string" && /^\d+$/.test(raw)
            ? Number(raw)
            : NaN;
      if (!integer(value, min, max))
        throw error("INVALID_INPUT", `Invalid --${name} value.`);
      return value;
    };
    const concurrency = numeric("concurrency", 4, 1, 16);
    const client = ["validate", "outcome"].includes(command)
      ? undefined
      : createJevClient({
          apiKey: io.apiKey ?? "",
          ...(io.fetch ? { fetch: io.fetch } : {}),
          timeoutMs: numeric("timeout-ms", 30_000, 1, 300_000),
          maxRetries: numeric(
            "max-retries",
            ["evidence-relevance", "finding-support"].includes(command) ? 0 : 2,
            0,
            5,
          ),
          retryTransportErrors: values["retry-transport-errors"] === true,
        });
    input = values.input === "-" ? io.stdin : createReadStream(values.input);
    io.signal?.addEventListener("abort", cancel, { once: true });
    if (io.signal?.aborted) {
      cancel();
      throw error("CANCELLED", "The command was cancelled.");
    }
    const call = io.signal ? { signal: io.signal } : {};
    if (command === "outcome") {
      const callId = await recordJevOutcome(
        (await readInput(input)) as JevOutcome,
      );
      await write(io.stdout, { recorded: true, callId });
      return 0;
    }
    if (command === "validate") {
      const request = validateRequest(await readInput(input));
      await write(io.stdout, {
        schemaVersion: 1,
        valid: true,
        requestId: request.id,
        questionIds: Object.keys(request.questions),
      });
      return 0;
    }
    setup = false;
    activityCommand = command;
    commandStarted = performance.now();
    await activity("jev.command.start", { model: JEV_MODEL });
    const loggedClient: JevClient = {
      async decide(value, options) {
        const sequence = admitted++;
        const started = performance.now();
        await activity("jev.request.start", { sequence });
        const result = await client!.decide(value, {
          ...options,
          metadata: {
            recipe: options?.metadata?.recipe ?? "custom",
            recipeVersion: 1,
            surface: "cli",
          },
        });
        completed++;
        await activity("jev.request.finish", {
          sequence,
          status: result.ok ? "success" : "failure",
          attempts: result.attempts,
          elapsedMs: Math.round(performance.now() - started),
          ...(!result.ok ? { errorCode: result.error.code } : {}),
        });
        return result;
      },
    };
    if (command !== "batch") {
      const value = await readInput(input);
      const recipe =
        command === "evidence-relevance"
          ? evidenceRelevance(value as EvidenceInput)
          : command === "finding-support"
            ? findingSupport(value as FindingInput)
            : undefined;
      const result = await loggedClient.decide(recipe?.request ?? value, {
        ...call,
        ...(recipe
          ? {
              metadata: {
                recipe: recipe.name,
                recipeVersion: recipe.version,
                surface: "cli" as const,
              },
            }
          : {}),
      });
      await write(io.stdout, {
        ...result,
        ...(recipe
          ? { recipe: recipe.name, recipeVersion: recipe.version }
          : {}),
      });
      return finish(result.ok ? 0 : 1);
    }
    let failed = false;
    for await (const result of decideBatch(loggedClient, readJsonLines(input), {
      concurrency,
      ...call,
    })) {
      if (!result.ok) failed = true;
      await write(io.stdout, result);
    }
    return finish(io.signal?.aborted || failed ? 1 : 0);
  } catch (cause) {
    const failure = io.signal?.aborted
      ? error("CANCELLED", "The command was cancelled.")
      : cause instanceof JevError
        ? cause
        : error("IO_ERROR", "Could not read input or write output.");
    try {
      await write(io.stderr, { schemaVersion: 1, error: failure.detail });
    } catch {
      /* Closed diagnostic pipe. */
    }
    return finish(setup ? 2 : 1);
  } finally {
    io.signal?.removeEventListener("abort", cancel);
    input?.destroy();
  }
}
