import { parseArgs } from "node:util";
import { checkVersion, sessionContext, type CheckOptions } from "./index.js";

const help = `poietic-harness check | session-start [options]
Read-only version alignment; never installs, updates, or invokes inference.
  --root PATH      Toolkit package root (defaults to this installation)
  --project PATH   Project root containing .poietic-harness.json (default cwd)
  --config PATH    Explicit user/deployment pin instead of project pin
  --expected VER   Explicit exact timestamp instead of a pin file
  --latest         Also check release availability when pinned
  --offline        Use local metadata only
check: JSON stdout; exit 0 aligned, 1 mismatch, 2 unknown/error.
session-start: Claude hook context JSON; always exit 0 to keep startup usable.
`;

export async function runMaintenance(
  args: string[],
  defaultRoot: string,
  dependencies: { fetch?: typeof globalThis.fetch } = {},
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
        help: { type: "boolean" },
      },
    });
    if (values.help || args.length === 0)
      return { stdout: help, stderr: "", exitCode: 0 };
    if (
      positionals.length !== 1 ||
      !["check", "session-start"].includes(positionals[0]!)
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

function hookOutput(additionalContext: string) {
  return {
    hookSpecificOutput: { hookEventName: "SessionStart", additionalContext },
  };
}
