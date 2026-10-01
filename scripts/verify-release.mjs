import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

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
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await rm(consumer, { recursive: true, force: true });
}
