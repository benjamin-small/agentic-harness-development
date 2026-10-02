import { parseArgs } from "node:util";
import { checkVersion, sessionContext, type CheckOptions } from "./check.js";
import { pollVersion, type PollOptions } from "./poll.js";

const help = `poietic-harness check | poll | session-start [options]
Read-only version alignment; never installs, updates, or invokes inference.
poll optionally writes a dedicated release cache for fast, model-free scheduling.
  --root PATH      Toolkit package root (defaults to this installation)
  --project PATH   Project root containing .poietic-harness.json (default cwd)
  --config PATH    Explicit user/deployment pin instead of project pin
  --expected VER   Explicit exact timestamp instead of a pin file
  --latest         Also check release availability when pinned
  --offline        Use local metadata only
poll options:
  --cache PATH     Dedicated writable release cache (optional)
  --max-age SEC    Reuse successful lookups for this long (default 300; 0 refreshes)
  --timeout-ms MS  Request/body deadline (default 1500; range 1..5000)
check: JSON stdout; exit 0 aligned, 1 mismatch, 2 unknown/error.
poll: JSON stdout; exit 0 no newer release, 1 update available, 2 unavailable/error.
session-start: Claude hook context JSON; always exit 0 to keep startup usable.
`;

export async function runMaintenance(
  args: string[],
  defaultRoot: string,
  dependencies: { fetch?: typeof globalThis.fetch; now?: () => number } = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const session = args[0] === "session-start";
  try {
    const { values, positionals } = parseArgs({
      args,
      allowPositionals: true,
      strict: true,
      options: {
        root: { type: "string" },
        project: { type: "string" },
        config: { type: "string" },
        expected: { type: "string" },
        latest: { type: "boolean" },
        offline: { type: "boolean" },
        cache: { type: "string" },
        "max-age": { type: "string" },
        "timeout-ms": { type: "string" },
        help: { type: "boolean" },
      },
    });
    if (values.help || args.length === 0)
      return { stdout: help, stderr: "", exitCode: 0 };
    if (
      positionals.length !== 1 ||
      !["check", "poll", "session-start"].includes(positionals[0]!)
    )
      throw new Error("Invalid command");
    const options: CheckOptions = {
      root: values.root ?? defaultRoot,
      ...dependencies,
    };
    for (const key of ["project", "config", "expected"] as const)
      if (values[key] !== undefined) options[key] = values[key];
    for (const key of ["latest", "offline"] as const)
      if (values[key] !== undefined) options[key] = values[key];
    if (positionals[0] === "poll") {
      if (values.latest) throw new Error("poll always checks latest");
      const pollOptions: PollOptions = { ...options };
      if (values.cache !== undefined) pollOptions.cache = values.cache;
      if (values["max-age"] !== undefined)
        pollOptions.maxAgeMs = integer(values["max-age"]) * 1_000;
      if (values["timeout-ms"] !== undefined)
        pollOptions.timeoutMs = integer(values["timeout-ms"]);
      const report = await pollVersion(pollOptions);
      return {
        stdout: `${JSON.stringify(report)}\n`,
        stderr: "",
        exitCode:
          report.updateAvailable === null ? 2 : report.updateAvailable ? 1 : 0,
      };
    }
    if (
      [values.cache, values["max-age"], values["timeout-ms"]].some(
        (value) => value !== undefined,
      )
    )
      throw new Error("Polling options require poll");
    const report = await checkVersion(options);
    const output = session ? hookOutput(sessionContext(report)) : report;
    return {
      stdout: `${JSON.stringify(output)}\n`,
      stderr: "",
      exitCode:
        session || report.alignment === "aligned"
          ? 0
          : report.alignment === "mismatch"
            ? 1
            : 2,
    };
  } catch {
    const message =
      "Poietic Harness version check unavailable: invalid arguments, pin, or installation metadata. Run poietic-harness check --help and inspect the local installation. No update was performed.";
    return session
      ? {
          stdout: `${JSON.stringify(hookOutput(message))}\n`,
          stderr: "",
          exitCode: 0,
        }
      : {
          stdout: "",
          stderr: `${JSON.stringify({ error: { code: "VERSION_CHECK_FAILED", message } })}\n`,
          exitCode: 2,
        };
  }
}

function integer(value: string): number {
  if (!/^\d+$/.test(value)) throw new Error("Expected whole number");
  return Number(value);
}

function hookOutput(additionalContext: string) {
  return {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  };
}
