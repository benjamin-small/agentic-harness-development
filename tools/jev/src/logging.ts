import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { error, type CallMetadata } from "./types.js";

/** Shared by library and CLI calls; independent of terminal activity output. */
export function jevLogPath(path = process.env.JEV_LOG_PATH): string {
  const selected =
    path ??
    join(homedir(), ".local", "state", "poietic-harness", "jev", "calls.jsonl");
  if (!selected || !isAbsolute(selected))
    throw error(
      "INVALID_CONFIG",
      "Jev log path must be an absolute file path.",
    );
  return selected;
}

export function callLogger(path: string, callId: string = randomUUID()) {
  const started = performance.now();
  const log = async (
    event: string,
    fields: Record<string, string | number> = {},
  ) => {
    try {
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      await appendFile(
        path,
        `${JSON.stringify({
          schemaVersion: 1,
          event,
          timestamp: new Date().toISOString(),
          callId,
          pid: process.pid,
          elapsedMs: Math.round(performance.now() - started),
          ...fields,
        })}\n`,
        { mode: 0o600 },
      );
    } catch {
      throw error(
        "IO_ERROR",
        "Could not persist the Jev call log. Any dispatched request may have been billed; do not retry automatically.",
      );
    }
  };
  return Object.assign(log, { callId });
}

/** Only fixed enums reach the log; never request IDs, evidence, or explanations. */
export function callMetadata(value?: CallMetadata): CallMetadata {
  if (value === undefined)
    return { recipe: "custom", recipeVersion: 1, surface: "library" };
  if (
    !value ||
    !["custom", "evidence_relevance", "finding_support"].includes(
      value.recipe,
    ) ||
    value.recipeVersion !== 1 ||
    !["library", "cli", "mcp"].includes(value.surface)
  )
    throw error("INVALID_INPUT", "Invalid Jev call metadata.");
  return { recipe: value.recipe, recipeVersion: 1, surface: value.surface };
}

export const OUTCOME_REASONS = [
  "accepted",
  "contrary_evidence",
  "uncertain",
  "credentials",
  "permission",
  "network",
  "invalid_result",
  "not_needed",
  "busy",
] as const;
export interface JevOutcome {
  callId?: string;
  outcome: "used" | "overridden" | "unavailable";
  reason: (typeof OUTCOME_REASONS)[number];
}
/** Caller-reported usefulness, not an accuracy label or proof of an action. */
export async function recordJevOutcome(
  value: JevOutcome,
  logPath?: string,
): Promise<string> {
  if (
    !value ||
    !["used", "overridden", "unavailable"].includes(value.outcome) ||
    !OUTCOME_REASONS.includes(value.reason) ||
    (value.callId !== undefined &&
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value.callId)) ||
    (value.outcome !== "unavailable" && !value.callId)
  )
    throw error("INVALID_INPUT", "Invalid Jev outcome or missing callId.");
  const log = callLogger(jevLogPath(logPath), value.callId);
  await log("jev.outcome", { outcome: value.outcome, reason: value.reason });
  return log.callId;
}
