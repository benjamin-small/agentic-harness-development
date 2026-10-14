import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { toolkitRoot } from "../src/index.js";

const components = [
  "skills/jev",
  "tools/jev",
  "skills/ui-standards",
  "agents/ui-reviewer",
  "agents/claude-code-reviewer",
  "agents/codex-reviewer",
  "agents/pi-reviewer",
  "agents/opencode-reviewer",
  "skills/poietic-harness-update",
  "skills/poietic-harness-start",
];

test("npm packages include local indexes and topics but exclude private working notes", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "expertise-package-"));
  try {
    await writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "expertise-fixture",
        version: "1.0.0",
        files: ["skills", "agents", "tools"],
      }),
    );
    for (const component of components) {
      await cp(join(toolkitRoot, component), join(fixture, component), {
        recursive: true,
        filter: (path) =>
          !/(?:knowledge|memory)[/\\]local(?:[/\\]|$)/.test(path),
      });
      for (const area of ["knowledge", "memory"]) {
        const local = join(fixture, component, area, "local");
        await mkdir(local);
        await writeFile(join(local, "INDEX.md"), "synthetic private index");
        await writeFile(
          join(local, "private-note.md"),
          "synthetic private note",
        );
      }
    }
    const result = spawnSync(
      "npm",
      [
        "pack",
        "--dry-run",
        "--ignore-scripts",
        "--json",
        "--cache",
        join(fixture, ".npm-cache"),
      ],
      { cwd: fixture, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const files: string[] = JSON.parse(result.stdout)[0].files.map(
      (entry: { path: string }) => entry.path,
    );
    assert.ok(
      !files.some((path) => path.includes("/local/")),
      "Private files entered the package",
    );
    for (const component of components) {
      assert.ok(files.includes(`${component}/knowledge/INDEX.md`));
      assert.ok(files.includes(`${component}/memory/INDEX.md`));
    }
    assert.ok(files.includes("skills/jev/knowledge/question-design.md"));
    assert.ok(files.includes("agents/ui-reviewer/AGENT.md"));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("Git ignores each component's private knowledge and memory", () => {
  const paths = components.flatMap((component) =>
    ["knowledge", "memory"].map(
      (area) => `${component}/${area}/local/private-note.md`,
    ),
  );
  const result = spawnSync("git", ["check-ignore", "--no-index", "--stdin"], {
    cwd: toolkitRoot,
    input: `${paths.join("\n")}\n`,
    encoding: "utf8",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stdout.trim().split("\n").sort(), paths.sort());
});

test("actual package excludes removed Jev server output and dependency", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "no-jev-server-"));
  try {
    const result = spawnSync(
      "npm",
      [
        "pack",
        "--dry-run",
        "--ignore-scripts",
        "--json",
        "--cache",
        join(fixture, "cache"),
      ],
      { cwd: toolkitRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr);
    const files: string[] = JSON.parse(result.stdout)[0].files.map(
      (entry: { path: string }) => entry.path,
    );
    assert.ok(
      !files.some((p) => /(?:^|\/)dist\/.*(?:mcp|jev-mock-transport)/i.test(p)),
      "Removed server output entered package",
    );
    const pkg = JSON.parse(
      await readFile(join(toolkitRoot, "package.json"), "utf8"),
    );
    assert.equal(pkg.bin["jev-mcp"], undefined);
    assert.equal(pkg.dependencies["@modelcontextprotocol/sdk"], undefined);
    assert.ok(files.includes("tools/jev/dist/src/cli.js"));
    assert.ok(files.includes("tools/jev/dist/src/recipes.js"));
    assert.ok(files.includes("tools/jev/package.json"));
    assert.ok(files.includes("tools/jev/docs/runtime.md"));
    assert.ok(files.includes("tools/jev/scripts/install-launcher.mjs"));
    assert.ok(files.includes("tools/jev/.env.example"));
    assert.ok(!files.some((p) => p.startsWith("dist/src/jev/")));
    assert.ok(
      !files.some(
        (p) =>
          p.startsWith("tools/jev/test/") ||
          p.startsWith("tools/jev/dist/test/"),
      ),
    );
    assert.ok(!files.some((p) => p.includes("/local/")));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("source release rejects forcibly tracked private embedded-tool expertise", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "private-tool-source-"));
  try {
    await mkdir(join(fixture, "scripts"));
    for (const name of [
      "package-release.mjs",
      "release-version.mjs",
      "embedded-tools.mjs",
    ])
      await cp(
        join(toolkitRoot, "scripts", name),
        join(fixture, "scripts", name),
      );
    const version = "2026.1013.214916";
    await writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "fixture",
        type: "module",
        version,
        private: true,
        embeddedTools: ["tools/jev"],
      }),
    );
    await writeFile(
      join(fixture, "package-lock.json"),
      JSON.stringify({ version, packages: { "": { version } } }),
    );
    await writeFile(
      join(fixture, "catalog.json"),
      JSON.stringify({ schemaVersion: 2 }),
    );
    await mkdir(join(fixture, "tools/jev/knowledge/local"), {
      recursive: true,
    });
    await writeFile(
      join(fixture, "tools/jev/package.json"),
      JSON.stringify({ private: true, version }),
    );
    await writeFile(
      join(fixture, "tools/jev/knowledge/local/private-note.md"),
      "synthetic private working note",
    );
    for (const args of [
      ["init", "--quiet"],
      ["add", "--force", "."],
      [
        "-c",
        "user.name=Fixture",
        "-c",
        "user.email=fixture@example.invalid",
        "commit",
        "--quiet",
        "-m",
        "Fixture",
      ],
    ]) {
      const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
      assert.equal(result.status, 0, result.stderr);
    }
    const result = spawnSync(
      process.execPath,
      [join(fixture, "scripts/package-release.mjs")],
      { cwd: fixture, encoding: "utf8" },
    );
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Private local expertise must not be tracked/);
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
