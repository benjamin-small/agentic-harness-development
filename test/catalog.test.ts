import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  loadCatalog,
  validateCatalog,
  validateResources,
  planSelection,
  type Catalog,
  type Harness,
  type Scope,
} from "../src/index.js";

const catalog = await loadCatalog();
const options = { harness: "claude-code" as const, scope: "project" as const };
const clone = () => structuredClone(catalog);

test("shipped catalog and progressively linked resources validate", async () => {
  await validateResources(catalog);
  assert.equal(catalog.components.length, 3);
});

test("UI capability includes its skill dependency before the reviewer", () => {
  const plan = planSelection(catalog, { ...options, include: ["ui-reviewer"] });
  assert.deepEqual(
    plan.components.map((entry) => entry.id),
    ["ui-standards", "ui-reviewer"],
  );
  assert.equal(plan.components[0]!.reason, "ui-reviewer");
  assert.equal(plan.components[0]!.destination, ".claude/skills/ui-standards");
  assert.equal(plan.components[1]!.destination, null);
  assert.equal(plan.mode, "plan-only");
});

test("no implicit UI install; explicit selection and exclusion are honored", () => {
  assert.deepEqual(planSelection(catalog, options).components, []);
  const plan = planSelection(catalog, {
    ...options,
    capabilities: ["ui"],
    exclude: ["ui-reviewer"],
  });
  assert.deepEqual(
    plan.components.map((entry) => entry.id),
    ["ui-standards"],
  );
  assert.throws(
    () =>
      planSelection(catalog, {
        ...options,
        capabilities: ["ui"],
        exclude: ["ui-standards"],
      }),
    /Excluded component/,
  );
  assert.throws(
    () =>
      planSelection(catalog, {
        ...options,
        include: ["jev"],
        exclude: ["jev"],
      }),
    /Excluded component/,
  );
});

test("user scopes use shared locations, deployments require an explicit destination", () => {
  const personal = planSelection(catalog, {
    harness: "pi",
    scope: "user",
    include: ["jev", "jev"],
  });
  assert.equal(personal.components.length, 1);
  assert.equal(personal.components[0]!.destination, "~/.agents/skills/jev");
  const deployment = planSelection(catalog, {
    harness: "codex",
    scope: "deployment",
    include: ["jev"],
  });
  assert.equal(deployment.components[0]!.destination, null);
  assert.match(deployment.limitations.join(" "), /explicit destinations/);
});

test("invalid selection names fail instead of silently producing a partial plan", () => {
  assert.throws(
    () => planSelection(catalog, { ...options, capabilities: ["typo"] }),
    /Unknown capability/,
  );
  assert.throws(
    () => planSelection(catalog, { ...options, include: ["missing"] }),
    /Unknown component/,
  );
  assert.throws(
    () => planSelection(catalog, { ...options, exclude: ["missing"] }),
    /Unknown component/,
  );
  assert.throws(
    () => planSelection(catalog, { ...options, harness: "unknown" as Harness }),
    /Unknown harness/,
  );
  assert.throws(
    () => planSelection(catalog, { ...options, scope: "system" as Scope }),
    /Unknown scope/,
  );
});

test("catalog rejects malformed structures, duplicates, and invalid lifecycle metadata", () => {
  assert.throws(() => validateCatalog({}), /Invalid catalog/);
  assert.throws(
    () => validateCatalog({ ...catalog, schemaVersion: 1 }),
    /Invalid catalog/,
  );
  const duplicate = clone();
  duplicate.components.push(duplicate.components[0]!);
  assert.throws(() => validateCatalog(duplicate), /Duplicate component/);
  const invalid = clone();
  delete invalid.components[2]!.execution;
  assert.throws(() => validateCatalog(invalid), /Invalid catalog/);
});

test("catalog rejects missing dependencies and dependency cycles", () => {
  const missing = clone();
  missing.components[0]!.requires = ["absent"];
  assert.throws(() => validateCatalog(missing), /Unknown dependency/);
  const cycle = clone();
  cycle.components[0]!.requires = ["ui-reviewer"];
  cycle.components[1]!.requires = ["jev"];
  assert.throws(() => validateCatalog(cycle), /Dependency cycle/);
});

test("catalog rejects traversal and mismatched paths", () => {
  const unsafe = clone();
  unsafe.components[0]!.path = "skills/../secret";
  assert.throws(() => validateCatalog(unsafe), /Unsafe component path/);
  unsafe.components[0]!.path = "skills/other";
  assert.throws(() => validateCatalog(unsafe), /Component path must/);
});

async function fixture(
  run: (root: string, entry: string, fixtureCatalog: Catalog) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "harness-catalog-test-"));
  const entry = join(root, "skills/jev/SKILL.md");
  await mkdir(join(root, "skills/jev"), { recursive: true });
  for (const area of ["knowledge", "memory"]) {
    await mkdir(join(root, "skills/jev", area), { recursive: true });
    await writeFile(
      join(root, "skills/jev", area, "INDEX.md"),
      "# Local index\n",
    );
  }
  const fixtureCatalog: Catalog = {
    schemaVersion: 2,
    components: [structuredClone(catalog.components[0]!)],
  };
  try {
    await run(root, entry, fixtureCatalog);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("resource validation rejects missing files, directories, invalid frontmatter, and broken links", async () => {
  await fixture(async (root, entry, fixtureCatalog) => {
    await assert.rejects(validateResources(fixtureCatalog, root), /ENOENT/);
    await mkdir(entry);
    await assert.rejects(
      validateResources(fixtureCatalog, root),
      /Expected file/,
    );
    await rm(entry, { recursive: true });
    for (const [text, expected] of [
      ["# Missing frontmatter", /Missing skill frontmatter/],
      ["---\n- name\n---\n", /Invalid skill metadata/],
      ["---\nname: wrong\ndescription: text\n---\n", /Invalid skill name/],
      [
        "---\nname: jev\ndescription: text\nmodel: something\n---\n",
        /Nonportable/,
      ],
      [
        "---\nname: jev\ndescription: text\nlicense: 5\n---\n",
        /Invalid skill license/,
      ],
      [
        "---\nname: jev\ndescription: text\ncompatibility: " +
          "x".repeat(501) +
          "\n---\n",
        /compatibility too long/,
      ],
      [
        "---\nname: jev\ndescription: text\nmetadata:\n  version: 1\n---\n",
        /Invalid skill metadata values/,
      ],
      [
        "---\nname: jev\ndescription: text\n---\n[missing](missing.md)",
        /ENOENT/,
      ],
    ] as const) {
      await writeFile(entry, text);
      await assert.rejects(validateResources(fixtureCatalog, root), expected);
    }
  });
});

test("resource validation prevents symlinks and relative links from escaping the bundle", async () => {
  await fixture(async (root, entry, fixtureCatalog) => {
    const outside = await mkdtemp(join(tmpdir(), "harness-outside-"));
    try {
      const secret = join(outside, "private.md");
      await writeFile(secret, "outside fixture");
      await symlink(secret, entry);
      await assert.rejects(
        validateResources(fixtureCatalog, root),
        /escapes toolkit/,
      );
      await rm(entry);
      await writeFile(
        entry,
        `---\nname: jev\ndescription: text\n---\n[outside](${secret})`,
      );
      await assert.rejects(
        validateResources(fixtureCatalog, root),
        /escapes toolkit/,
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  });
});

test("linked Markdown cycles terminate and optional metadata is validated", async () => {
  await fixture(async (root, entry, fixtureCatalog) => {
    await writeFile(
      entry,
      "---\nname: jev\ndescription: text\ncompatibility: any\nlicense: MIT\nmetadata:\n  version: '1'\n---\n[ref](ref.md) [anchor](#section)",
    );
    await writeFile(
      join(root, "skills/jev/ref.md"),
      "[back](SKILL.md) [external](https://example.com)",
    );
    await validateResources(fixtureCatalog, root);
  });
});

test("both local expertise indexes are required and their topic links are checked", async () => {
  await fixture(async (root, entry, fixtureCatalog) => {
    await writeFile(entry, "---\nname: jev\ndescription: text\n---\n");
    for (const area of ["knowledge", "memory"]) {
      const index = join(root, "skills/jev", area, "INDEX.md");
      await rm(index);
      await assert.rejects(validateResources(fixtureCatalog, root), /ENOENT/);
      await writeFile(index, "[missing](missing.md)");
      await assert.rejects(validateResources(fixtureCatalog, root), /ENOENT/);
      await writeFile(index, "# Index\n");
    }
    await validateResources(fixtureCatalog, root);
  });
});

test("public entrypoints and indexes cannot pull private local notes into validation", async () => {
  await fixture(async (root, entry, fixtureCatalog) => {
    await writeFile(entry, "---\nname: jev\ndescription: text\n---\n");
    await mkdir(join(root, "skills/jev/memory/local"));
    await writeFile(
      join(root, "skills/jev/memory/local/note.md"),
      "private fixture",
    );
    await writeFile(
      join(root, "skills/jev/memory/INDEX.md"),
      "[private](local/note.md)",
    );
    await assert.rejects(
      validateResources(fixtureCatalog, root),
      /must not link private/,
    );
  });
});

function cli(...args: string[]) {
  return spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../src/cli.js", import.meta.url)), ...args],
    { encoding: "utf8" },
  );
}

test("CLI emits JSON results on stdout and errors exclusively on stderr", () => {
  const result = cli(
    "plan",
    "--capability",
    "ui",
    "--harness",
    "codex",
    "--scope",
    "project",
  );
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
  assert.equal(JSON.parse(result.stdout).components.length, 2);
  for (const args of [
    ["plan"],
    ["unknown"],
    ["plan", "--unknown"],
    ["catalog", "--include", "jev"],
    ["catalog", "extra"],
  ]) {
    const failure = cli(...args);
    assert.equal(failure.status, 1);
    assert.equal(failure.stdout, "");
    assert.equal(JSON.parse(failure.stderr).error.code, "INVALID_INPUT");
  }
});

test("CLI catalog, validation, and help work without credentials", () => {
  assert.equal(JSON.parse(cli("catalog").stdout).schemaVersion, 2);
  assert.equal(JSON.parse(cli("validate").stdout).valid, true);
  assert.match(cli("--help").stdout, /Read-only/);
  assert.match(cli().stdout, /harness-kit/);
});
