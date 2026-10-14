import assert from "node:assert/strict";
import { readFile, writeFile, mkdir, symlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import { execFileSync } from "node:child_process";
import { verifyJevRecipes } from "./verify-recipes.mjs";

/** Tool-owned probes of an exact installed toolkit; no real provider traffic. */
export async function verifyJevConsumer(packageRoot, consumer, manifest) {
  const installed = JSON.parse(
    await readFile(join(packageRoot, "package.json"), "utf8"),
  );
  const run = (command, args) =>
    execFileSync(command, args, {
      cwd: consumer,
      encoding: "utf8",
      env: { ...process.env, NODE_ENV: "production" },
    });
  if (installed.embeddedTools?.includes("tools/jev")) {
    const toolRoot = join(packageRoot, "tools/jev");
    const runner = join(consumer, "node_modules/.bin/jev-run");
    const cacheRoot = join(consumer, "launcher-cache");
    const selectedRoot = join(
      cacheRoot,
      manifest.version,
      "runtime/node_modules",
      manifest.packageName,
    );
    await mkdir(dirname(selectedRoot), { recursive: true });
    await symlink(
      join(consumer, "node_modules", manifest.packageName),
      selectedRoot,
      "dir",
    );
    const pin = join(consumer, "launcher-pin.json");
    const config = join(consumer, "launcher.json");
    await writeFile(
      pin,
      JSON.stringify({ schemaVersion: 1, version: manifest.version }),
    );
    await writeFile(
      config,
      JSON.stringify({
        schemaVersion: 1,
        pinPath: pin,
        runtimeCacheRoot: cacheRoot,
        credentialFile: join(consumer, "nonexistent-key"),
        logPath: join(consumer, "launcher-calls.jsonl"),
        allowedDataScopes: ["public", "synthetic", "private"],
      }),
    );
    const status = JSON.parse(run(runner, ["status", "--config", config]));
    assert.equal(status.runtimeVersion, manifest.version);
    assert.equal(status.runtimeCli, join(selectedRoot, installed.bin.jev));
    assert.equal(status.liveVerified, false);
    for (const path of [
      "docs/runtime.md",
      "scripts/install-launcher.mjs",
      "knowledge/INDEX.md",
      "memory/INDEX.md",
    ])
      assert.ok((await readFile(join(toolRoot, path), "utf8")).length);
  }
  const jevProbe = `import assert from 'node:assert/strict';
import {createJevClient, decideBatch, validateRequest, JEV_MODEL} from '@benjamin-small/agentic-harness-development/jev';
const request = {id:'consumer-check',state:'Synthetic input',questions:{check:{type:'noul',instructions:'Is the input synthetic?'}}};
validateRequest(request);
const client = createJevClient({apiKey:'fixture-only',logPath:${JSON.stringify(join(consumer, "jev-calls.jsonl"))},fetch:async () => Response.json({model:JEV_MODEL,answers:{check:{type:'noul',noul:1}},usage:{input_tokens:1,output_tokens:1}})});
const result = await client.decide(request);
assert.equal(result.ok,true);
assert.equal(result.requestId,'consumer-check');
const results = [];
for await (const item of decideBatch(client,[request,null])) results.push(item);
assert.equal(results.length,2);
assert.equal(results.find(r => r.sequence === 0).ok,true);
assert.equal(results.find(r => r.sequence === 1).ok,false);`;
  run(process.execPath, ["--input-type=module", "-e", jevProbe]);
  if (manifest.capabilities.includes("jev-persistent-call-logging")) {
    const calls = (await readFile(join(consumer, "jev-calls.jsonl"), "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(
      calls.filter((item) => item.event === "jev.call.start").length,
      3,
    );
    assert.equal(
      calls.filter((item) => item.event === "jev.call.finish").length,
      3,
    );
    assert.equal(new Set(calls.map((item) => item.callId)).size, 3);
    assert.ok(!JSON.stringify(calls).includes("fixture-only"));
  }
  const jevBin = join(consumer, "node_modules/.bin/jev");
  assert.equal(run(jevBin, ["--version"]).trim(), manifest.version);
  await writeFile(
    join(consumer, "decision.json"),
    JSON.stringify({
      id: "consumer-check",
      state: "Synthetic input",
      questions: {
        check: { type: "noul", instructions: "Is the input synthetic?" },
      },
    }),
  );
  assert.equal(
    JSON.parse(run(jevBin, ["validate", "--input", "decision.json"])).valid,
    true,
  );

  const checks = [
    "jev-library-mock",
    "jev-batch",
    "jev-cli-validation",
    "jev-version",
  ];
  if (manifest.capabilities.includes("jev-persistent-call-logging"))
    checks.push("jev-persistent-call-log");
  if (installed.embeddedTools?.includes("tools/jev"))
    checks.push("jev-embedded-runner-paths");
  if (manifest.capabilities.includes("jev-recipes-and-outcomes")) {
    await verifyJevRecipes(packageRoot, consumer);
    checks.push("jev-library-cli-recipes-outcome");
  }
  return checks;
}
