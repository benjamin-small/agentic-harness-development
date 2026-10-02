import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { versionTimestamp } from "./release-version.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, process.argv[2] ?? "release");
const manifestText = await readFile(join(out, "manifest.json"), "utf8");
const manifest = JSON.parse(manifestText);
assert.equal(manifest.schemaVersion, 1);
assert.ok([1, 2].includes(manifest.catalogSchemaVersion));
assert.equal(
  manifest.packageName,
  "@benjamin-small/agentic-harness-development",
);
assert.match(manifest.sourceCommit, /^[a-f0-9]{40}$/);
assert.equal(manifest.tag, `v${manifest.version}`);
if (manifest.versioning === "utc-timestamp") {
  assert.equal(manifest.versionTimestamp, versionTimestamp(manifest.version));
} else {
  assert.equal(manifest.versioning, undefined);
  assert.ok(
    ["0.1.0-alpha.1", "0.1.0-alpha.2"].includes(manifest.version),
    "Missing timestamp version metadata",
  );
}
const sums = (await readFile(join(out, "SHA256SUMS"), "utf8"))
  .trim()
  .split("\n");
const expected = new Map([
  ...manifest.artifacts.map((asset) => [asset.name, asset.sha256]),
  ["manifest.json", createHash("sha256").update(manifestText).digest("hex")],
]);
assert.equal(sums.length, expected.size);
for (const line of sums) {
  const match = /^([a-f0-9]{64})  ([a-zA-Z0-9][a-zA-Z0-9._-]*)$/.exec(line);
  assert.ok(match, "Invalid checksum entry");
  const [, hash, name] = match;
  assert.equal(expected.get(name), hash, `Manifest mismatch: ${name}`);
  assert.equal(
    createHash("sha256")
      .update(await readFile(join(out, name)))
      .digest("hex"),
    hash,
    `Checksum mismatch: ${name}`,
  );
  expected.delete(name);
}
assert.equal(expected.size, 0);
const packageAsset = manifest.artifacts.find((asset) =>
  asset.name.endsWith(".tgz"),
);
assert.ok(packageAsset, "Missing package artifact");
const consumer = await mkdtemp(join(tmpdir(), "harness-consumer-"));
const run = (command, args) =>
  execFileSync(command, args, {
    cwd: consumer,
    encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production" },
  });
try {
  await writeFile(
    join(consumer, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    "--cache",
    join(consumer, ".npm-cache"),
    join(out, packageAsset.name),
  ]);
  const probe = `import assert from 'node:assert/strict';
import {loadCatalog, validateResources, planSelection} from '@benjamin-small/agentic-harness-development';
const catalog = await loadCatalog();
assert.equal(catalog.schemaVersion, ${JSON.stringify(manifest.catalogSchemaVersion)});
await validateResources(catalog);
assert.deepEqual(planSelection(catalog, {harness:'pi',scope:'user'}).components, []);
const plan = planSelection(catalog, {harness:'pi',scope:'user',capabilities:['ui']});
assert.deepEqual(plan.components.map(c => c.id), ['ui-standards','ui-reviewer']);
assert.equal(plan.components[0].destination, '~/.agents/skills/ui-standards');`;
  run(process.execPath, ["--input-type=module", "-e", probe]);
  const bin = join(consumer, "node_modules/.bin/harness-kit");
  const validation = JSON.parse(run(bin, ["validate"]));
  assert.equal(validation.valid, true);
  const selection = JSON.parse(
    run(bin, [
      "plan",
      "--include",
      "jev",
      "--harness",
      "codex",
      "--scope",
      "project",
    ]),
  );
  assert.equal(selection.components[0].id, "jev");
  const installed = JSON.parse(
    await readFile(
      join(
        consumer,
        "node_modules/@benjamin-small/agentic-harness-development/package.json",
      ),
      "utf8",
    ),
  );
  assert.equal(installed.version, manifest.version);
  const hasMaintenance = manifest.capabilities.includes(
    "session-version-check",
  );
  if (hasMaintenance) {
    const packageRoot = join(
      consumer,
      "node_modules/@benjamin-small/agentic-harness-development",
    );
    const maintenanceProbe = `import assert from 'node:assert/strict';
import {checkVersion} from '@benjamin-small/agentic-harness-development/maintenance';
const result = await checkVersion({root:${JSON.stringify(packageRoot)},expected:${JSON.stringify(manifest.version)},offline:true});
assert.equal(result.alignment,'aligned');
assert.equal(result.integrity,'not-checked');`;
    run(process.execPath, ["--input-type=module", "-e", maintenanceProbe]);
    const maintenanceBin = join(consumer, "node_modules/.bin/poietic-harness");
    await writeFile(
      join(consumer, ".poietic-harness.json"),
      JSON.stringify({ schemaVersion: 1, version: manifest.version }),
    );
    const report = JSON.parse(
      run(maintenanceBin, ["check", "--project", consumer, "--offline"]),
    );
    assert.equal(report.alignment, "aligned");
    assert.equal(report.latest.status, "not-checked");
    if (manifest.capabilities.includes("deterministic-release-polling")) {
      const cache = join(consumer, "release-cache.json");
      const pollProbe = `import assert from 'node:assert/strict';
import {pollVersion} from '@benjamin-small/agentic-harness-development/maintenance';
const options = {root:${JSON.stringify(packageRoot)},project:${JSON.stringify(consumer)},cache:${JSON.stringify(cache)}};
const fresh = await pollVersion({...options, fetch:async () => Response.json({tag_name:${JSON.stringify(manifest.tag)},draft:false,prerelease:false})});
assert.equal(fresh.updateAvailable,false);
assert.equal(fresh.polling.cache,'written');
const cached = await pollVersion({...options,offline:true});
assert.equal(cached.polling.source,'cache');`;
      run(process.execPath, ["--input-type=module", "-e", pollProbe]);
      const polled = JSON.parse(
        run(maintenanceBin, [
          "poll",
          "--project",
          consumer,
          "--cache",
          cache,
          "--offline",
        ]),
      );
      assert.equal(polled.updateAvailable, false);
      assert.equal(polled.polling.source, "cache");
    }
    const pluginRoot = join(packageRoot, "dist/claude-plugin/poietic-harness");
    const plugin = JSON.parse(
      await readFile(join(pluginRoot, ".claude-plugin/plugin.json"), "utf8"),
    );
    assert.equal(plugin.name, "poietic-harness");
    assert.equal(plugin.version, manifest.version);
    const hooks = JSON.parse(
      await readFile(join(pluginRoot, "hooks/hooks.json"), "utf8"),
    );
    const hook = hooks.hooks.SessionStart[0].hooks[0];
    assert.equal(hook.command, "node");
    const args = hook.args.map((arg) =>
      arg
        .replaceAll("${CLAUDE_PLUGIN_ROOT}", pluginRoot)
        .replaceAll("${CLAUDE_PROJECT_DIR}", consumer),
    );
    const context = JSON.parse(run(process.execPath, args)).hookSpecificOutput;
    assert.equal(context.hookEventName, "SessionStart");
    assert.match(context.additionalContext, /aligned \(equal\)/);
    for (const path of [
      "SKILL.md",
      "knowledge/INDEX.md",
      "knowledge/checking.md",
      "knowledge/updating.md",
      "knowledge/harnesses.md",
      "memory/INDEX.md",
    ])
      assert.equal(
        await readFile(join(pluginRoot, "skills/update", path), "utf8"),
        await readFile(join(packageRoot, "skills/update", path), "utf8"),
      );
  }
  const hasJev = manifest.capabilities.includes("jev-typescript-library");
  if (hasJev) {
    const jevProbe = `import assert from 'node:assert/strict';
import {createJevClient, decideBatch, validateRequest, JEV_MODEL} from '@benjamin-small/agentic-harness-development/jev';
const request = {id:'consumer-check',state:'Synthetic input',questions:{check:{type:'noul',instructions:'Is the input synthetic?'}}};
validateRequest(request);
const client = createJevClient({apiKey:'fixture-only',fetch:async () => Response.json({model:JEV_MODEL,answers:{check:{type:'noul',noul:1}},usage:{input_tokens:1,output_tokens:1}})});
const result = await client.decide(request);
assert.equal(result.ok,true);
assert.equal(result.requestId,'consumer-check');
const results = [];
for await (const item of decideBatch(client,[request,null])) results.push(item);
assert.equal(results.length,2);
assert.equal(results.find(r => r.sequence === 0).ok,true);
assert.equal(results.find(r => r.sequence === 1).ok,false);`;
    run(process.execPath, ["--input-type=module", "-e", jevProbe]);
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
  }
  console.log(
    JSON.stringify(
      {
        verified: true,
        version: manifest.version,
        sourceCommit: manifest.sourceCommit,
        checks: [
          "checksums",
          "isolated-install",
          "library-import",
          "bundled-resources",
          "cli-bin",
          "selection",
          ...(hasMaintenance
            ? [
                "maintenance-library",
                "maintenance-cli-pin",
                ...(manifest.capabilities.includes(
                  "deterministic-release-polling",
                )
                  ? ["maintenance-poll-library", "maintenance-poll-cli-cache"]
                  : []),
                "claude-plugin-version",
                "claude-hook-command",
                "canonical-update-skill",
              ]
            : []),
          ...(hasJev
            ? [
                "jev-library-mock",
                "jev-batch",
                "jev-cli-validation",
                "jev-version",
              ]
            : []),
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
