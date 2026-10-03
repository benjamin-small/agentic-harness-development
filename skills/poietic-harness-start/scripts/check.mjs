#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

// No caller-selected command, endpoint, pin, cache, or installation destination.
try {
  if (process.argv.length !== 2) throw new Error("No arguments accepted");
  const home = homedir();
  const config = join(home, ".codex/poietic-harness/.poietic-harness.json");
  const pin = JSON.parse(readFileSync(config, "utf8"));
  if (
    pin.schemaVersion !== 1 ||
    typeof pin.version !== "string" ||
    !/^\d{4}\.\d{1,4}\.\d{1,6}$/.test(pin.version)
  )
    throw new Error("Invalid user pin");
  const root = join(
    home,
    ".local/share/agentic-harness-development",
    pin.version,
    "runtime/node_modules/@benjamin-small/agentic-harness-development",
  );
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  if (
    pkg.name !== "@benjamin-small/agentic-harness-development" ||
    pkg.version !== pin.version
  )
    throw new Error("Runtime does not match pin");
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  const result = spawnSync(
    process.execPath,
    [
      join(root, "dist/src/maintenance/cli.js"),
      "poll",
      "--config",
      config,
      "--cache",
      join(home, ".cache/poietic-harness/latest-release.json"),
      "--max-age",
      "300",
      "--timeout-ms",
      "1500",
    ],
    {
      cwd: root,
      env,
      encoding: "utf8",
      timeout: 10000,
      maxBuffer: 262144,
    },
  );
  if (result.error || result.signal || ![0, 1, 2].includes(result.status))
    throw new Error("Checker unavailable");
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  process.exitCode = result.status;
} catch {
  process.stderr.write(
    JSON.stringify({
      error: {
        code: "STARTUP_CHECK_UNAVAILABLE",
        message:
          "Check the user pin and installed runtime. This helper accepts no arguments and performs no installation or update.",
      },
    }) + "\n",
  );
  process.exitCode = 2;
}
