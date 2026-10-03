import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
const script = new URL(
  "../skills/poietic-harness-start/scripts/check.mjs",
  import.meta.url,
).pathname;

test("startup helper bounds command, runtime and destinations without changing the pin", async () => {
  const home = await mkdtemp(join(tmpdir(), "startup-helper-"));
  try {
    const config = join(home, ".codex/poietic-harness/.poietic-harness.json");
    const root = join(
      home,
      ".local/share/agentic-harness-development/2026.1002.2233/runtime/node_modules/@benjamin-small/agentic-harness-development",
    );
    await mkdir(join(home, ".codex/poietic-harness"), { recursive: true });
    await mkdir(join(root, "dist/src/maintenance"), { recursive: true });
    const pin = JSON.stringify({ schemaVersion: 1, version: "2026.1002.2233" });
    await writeFile(config, pin);
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({
        name: "@benjamin-small/agentic-harness-development",
        version: "2026.1002.2233",
      }),
    );
    await writeFile(
      join(root, "dist/src/maintenance/cli.js"),
      "console.log(JSON.stringify(process.argv.slice(2))); process.exitCode = 1;",
    );
    const run = (...args) =>
      spawnSync(process.execPath, [script, ...args], {
        env: { ...process.env, HOME: home },
        encoding: "utf8",
      });
    const valid = run();
    assert.equal(valid.status, 1);
    assert.deepEqual(JSON.parse(valid.stdout), [
      "poll",
      "--config",
      config,
      "--cache",
      join(home, ".cache/poietic-harness/latest-release.json"),
      "--max-age",
      "300",
      "--timeout-ms",
      "1500",
    ]);
    assert.equal(await readFile(config, "utf8"), pin);
    assert.equal(run("--root", "/tmp/other").status, 2);
    await writeFile(
      config,
      JSON.stringify({ schemaVersion: 1, version: "../../other" }),
    );
    assert.equal(run().status, 2);
    await writeFile(config, pin);
    await writeFile(join(root, "package.json"), "{}");
    assert.equal(run().status, 2);
  } finally {
    await rm(home, { recursive: true, force: true });
  }
});
