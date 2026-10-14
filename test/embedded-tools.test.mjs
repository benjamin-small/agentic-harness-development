import { test } from "node:test";
import assert from "node:assert/strict";
import {
  readFile,
  mkdtemp,
  mkdir,
  writeFile,
  rm,
  symlink,
} from "node:fs/promises";
import { resolve, join, sep } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import {
  versionTime as harnessVersion,
  validatePin as harnessPin,
} from "../dist/src/maintenance/version.js";
import {
  versionTime as toolVersion,
  validatePin as toolPin,
} from "../tools/jev/dist/src/toolkit-version.js";
import { embeddedTools } from "../scripts/embedded-tools.mjs";
import { stampRelease } from "../scripts/stamp-release.mjs";

const root = resolve(import.meta.dirname, "..");
test("compiler dependency graphs separate generic harness source from embedded tools", () => {
  const compiler = join(root, "node_modules/.bin/tsc");
  const list = (project) => {
    const result = spawnSync(
      compiler,
      ["--project", project, "--listFilesOnly"],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    return result.stdout
      .trim()
      .split("\n")
      .map((p) => resolve(p.trim()));
  };
  const generic = list("tsconfig.json");
  const component = resolve(root, "tools/jev");
  assert.ok(
    !generic.some((file) => file.startsWith(component + sep)),
    "Generic TypeScript imports embedded implementation",
  );
  const tool = list("tools/jev/tsconfig.json");
  for (const file of tool)
    assert.ok(
      file.startsWith(component + sep) ||
        file.startsWith(join(root, "node_modules") + sep),
      `Embedded tool imports repository internals: ${file}`,
    );
  assert.ok(tool.includes(join(component, "src/index.ts")));
  assert.ok(generic.includes(join(root, "src/index.ts")));
});

test("tool-local pin/timestamp contract conforms to generic maintenance validation", () => {
  const versions = [
    "2026.1013.214916",
    "2028.229.0",
    "2026.102.304",
    "2026.1231.235959",
    "2026.229.0",
    "2026.431.0",
    "2026.1301.0",
    "2026.1001.240000",
    "2026.1001.126000",
    "2026.1001.123460",
    "2026.0102.304",
    "2026.102.000304",
    "1.2.3",
    "2026.1013.214916-extra",
    null,
    3,
  ];
  const capture = (fn, value) => {
    try {
      return { ok: true, value: fn(value) };
    } catch {
      return { ok: false };
    }
  };
  for (const version of versions) {
    assert.deepEqual(
      capture(toolVersion, version),
      capture(harnessVersion, version),
    );
    for (const pin of [
      { schemaVersion: 1, version },
      { schemaVersion: 2, version },
      { schemaVersion: 1, version, extra: true },
    ])
      assert.deepEqual(capture(toolPin, pin), capture(harnessPin, pin));
  }
  for (const value of [null, [], "2026.1013.214916", {}])
    assert.deepEqual(capture(toolPin, value), capture(harnessPin, value));
});

test("embedded manifests stamp together and invalid declarations cannot partially stamp", async () => {
  const dir = await mkdtemp(join(tmpdir(), "embedded-stamp-"));
  try {
    const pkg = {
      name: "fixture",
      version: "2026.1013.214916",
      embeddedTools: ["tools/first", "tools/second"],
    };
    const lock = {
      version: pkg.version,
      packages: { "": { version: pkg.version } },
    };
    await writeFile(join(dir, "package.json"), JSON.stringify(pkg));
    await writeFile(join(dir, "package-lock.json"), JSON.stringify(lock));
    await mkdir(join(dir, "tools/first"), { recursive: true });
    await writeFile(
      join(dir, "tools/first/package.json"),
      JSON.stringify({ private: true, version: pkg.version }),
    );
    const before = await readFile(join(dir, "package.json"), "utf8");
    await assert.rejects(stampRelease(dir, new Date("2026-10-13T21:49:17Z")));
    assert.equal(await readFile(join(dir, "package.json"), "utf8"), before);
    assert.equal(
      JSON.parse(await readFile(join(dir, "tools/first/package.json"), "utf8"))
        .version,
      pkg.version,
    );
    await mkdir(join(dir, "tools/second"));
    const second = join(dir, "tools/second/package.json");
    await writeFile(
      second,
      JSON.stringify({ private: true, version: "2026.1013.214915" }),
    );
    await assert.rejects(
      stampRelease(dir, new Date("2026-10-13T21:49:17Z")),
      /match toolkit/,
    );
    assert.equal(await readFile(join(dir, "package.json"), "utf8"), before);
    await writeFile(
      second,
      JSON.stringify({ private: true, version: pkg.version }),
    );
    const result = await stampRelease(dir, new Date("2026-10-13T21:49:17Z"));
    for (const path of [
      "package.json",
      "tools/first/package.json",
      "tools/second/package.json",
    ])
      assert.equal(
        JSON.parse(await readFile(join(dir, path), "utf8")).version,
        result.version,
      );
    await assert.rejects(
      embeddedTools(dir, { ...pkg, embeddedTools: ["../escape"] }),
      /tools/,
    );
    await assert.rejects(
      embeddedTools(dir, {
        ...pkg,
        embeddedTools: ["tools/first", "tools/first"],
      }),
      /unique/,
    );
    await assert.rejects(
      embeddedTools(dir, { ...pkg, embeddedTools: "tools/first" }),
      /unique/,
    );
    const outside = await mkdtemp(join(tmpdir(), "embedded-outside-"));
    try {
      await writeFile(
        join(outside, "package.json"),
        JSON.stringify({ private: true, version: pkg.version }),
      );
      await symlink(outside, join(dir, "tools/escape"));
      await assert.rejects(
        embeddedTools(dir, { ...pkg, embeddedTools: ["tools/escape"] }),
        /escapes/,
      );
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
