import { randomUUID } from "node:crypto";
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { error } from "./types.js";

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

export function callLogger(path: string) {
  const callId = randomUUID();
  const started = performance.now();
  return async (
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
}
