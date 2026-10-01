import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { toolkitRoot } from "../src/index.js";

const components = ["skills/jev", "skills/ui-standards", "agents/ui-reviewer"];

test("npm packages include local indexes and topics but exclude private working notes", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "expertise-package-"));
  try {
    await writeFile(
      join(fixture, "package.json"),
      JSON.stringify({
        name: "expertise-fixture",
        version: "1.0.0",
        files: ["skills", "agents"],
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
