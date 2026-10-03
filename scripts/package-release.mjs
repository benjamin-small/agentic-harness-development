import { readFile, mkdir, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { verifyVersionMetadata } from "./release-version.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const run = (command, args) =>
  execFileSync(command, args, { cwd: root, encoding: "utf8" }).trim();
const pkg = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const catalog = JSON.parse(
  await readFile(resolve(root, "catalog.json"), "utf8"),
);
const isLocalExpertise = (path) =>
  /(?:^|\/)(?:knowledge|memory)\/local(?:\/|$)/.test(path);
const lock = JSON.parse(
  await readFile(resolve(root, "package-lock.json"), "utf8"),
);
const versionTimestamp = verifyVersionMetadata(pkg, lock);
const tag = `v${pkg.version}`;
if (
  process.env.GITHUB_REF_TYPE === "tag" &&
  process.env.GITHUB_REF_NAME !== tag
)
  throw new Error("Git tag and package version differ");
if (run("git", ["status", "--porcelain"]))
  throw new Error(
    "Commit tracked and untracked changes before packaging a release",
  );
const sourceCommit = run("git", ["rev-parse", "HEAD"]);
const trackedPaths = run("git", ["ls-files", "-z"]).split("\0");
if (trackedPaths.some(isLocalExpertise))
  throw new Error(
    "Private local expertise must not be tracked or included in source releases",
  );
const out = resolve(root, "release");
await rm(out, { recursive: true, force: true });
await mkdir(out);
const packed = JSON.parse(
  run("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", out]),
);
const packageAsset = packed[0].filename;
for (const file of packed[0].files) {
  if (
    isLocalExpertise(file.path) ||
    (file.path !== ".env.example" &&
      /(^|\/)(?:\.env(?:\..*)?|node_modules|coverage|test|\.git)(?:\/|$)/.test(
        file.path,
      ))
  )
    throw new Error(`Unexpected package member: ${file.path}`);
}
const sourceAsset = `agentic-harness-development-${pkg.version}-source.tar.gz`;
run("git", [
  "archive",
  "--format=tar.gz",
  `--prefix=agentic-harness-development-${pkg.version}/`,
  `--output=${resolve(out, sourceAsset)}`,
  "HEAD",
]);
const artifacts = [];
for (const name of [packageAsset, sourceAsset]) {
  const data = await readFile(resolve(out, name));
  artifacts.push({
    name,
    bytes: data.length,
    sha256: createHash("sha256").update(data).digest("hex"),
  });
}
const manifest = {
  schemaVersion: 1,
  version: pkg.version,
  versioning: "utc-timestamp",
  versionTimestamp,
  tag,
  sourceCommit,
  packageName: pkg.name,
  node: pkg.engines.node,
  catalogSchemaVersion: catalog.schemaVersion,
  artifacts,
  capabilities: [
    "portable-instructions",
    "catalog-validation",
    "explicit-selection-plans",
    "jev-typescript-library",
    "jev-cli-and-jsonl-batches",
    "jev-persistent-call-logging",
    "jev-recipes-and-outcomes",
    "jev-stdio-mcp",
    "session-version-check",
    "deterministic-release-polling",
    "scoped-update-skill",
    "claude-maintenance-plugin",
  ],
  notIncluded: [
    "automatic-project-detection",
    "installation-writes",
    "native-agent-adapters",
    "persistent-agent-service",
  ],
};
const manifestData = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(resolve(out, "manifest.json"), manifestData);
const hashes = [
  ...artifacts,
  {
    name: "manifest.json",
    sha256: createHash("sha256").update(manifestData).digest("hex"),
  },
];
await writeFile(
  resolve(out, "SHA256SUMS"),
  `${hashes.map((asset) => `${asset.sha256}  ${asset.name}`).join("\n")}\n`,
);
console.log(
  JSON.stringify(
    { tag, sourceCommit, artifacts: hashes.map((asset) => asset.name) },
    null,
    2,
  ),
);
