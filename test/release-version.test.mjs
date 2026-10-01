import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  timestampVersion,
  versionTimestamp,
  verifyVersionMetadata,
} from "../scripts/release-version.mjs";
import { stampRelease } from "../scripts/stamp-release.mjs";

test("timestamp versions preserve UTC seconds, midnight, and leap-day dates", () => {
  for (const [iso, version] of [
    ["2026-10-01T17:12:48.000Z", "2026.1001.171248"],
    ["2026-01-02T00:03:04.000Z", "2026.102.304"],
    ["2028-02-29T00:00:00.000Z", "2028.229.0"],
    ["2026-12-31T23:59:59.000Z", "2026.1231.235959"],
  ]) {
    assert.equal(timestampVersion(new Date(iso)), version);
    assert.equal(versionTimestamp(version), iso);
  }
  assert.equal(
    timestampVersion(new Date("2026-10-01T13:12:48-04:00")),
    "2026.1001.171248",
  );
  assert.equal(
    timestampVersion(new Date("2026-10-01T17:12:48.999Z")),
    "2026.1001.171248",
  );
});

test("version validation rejects revisions, padding, impossible dates, and invalid times", () => {
  for (const version of [
    "1.2.3",
    "0.1.0-alpha.2",
    "2026.0102.304",
    "2026.102.000304",
    "2026.229.0",
    "2026.1301.0",
    "2026.431.0",
    "2026.1001.240000",
    "2026.1001.126000",
    "2026.1001.123460",
    "2026.1001.123400-extra",
    "2026.1001.123400+build",
    "2026.1001.1234000",
  ]) {
    assert.throws(() => versionTimestamp(version));
  }
  for (const date of [
    new Date(NaN),
    new Date("0999-01-01T00:00:00Z"),
    new Date("+010000-01-01T00:00:00Z"),
  ])
    assert.throws(() => timestampVersion(date));
});

test("release metadata requires the exact same timestamp in package and lockfile", () => {
  const pkg = { version: "2026.1001.171248" };
  const lock = {
    version: pkg.version,
    packages: { "": { version: pkg.version } },
  };
  assert.equal(verifyVersionMetadata(pkg, lock), "2026-10-01T17:12:48.000Z");
  assert.throws(
    () => verifyVersionMetadata(pkg, { ...lock, version: "2026.1001.171249" }),
    /differ/,
  );
  assert.throws(
    () => verifyVersionMetadata(pkg, { version: pkg.version, packages: {} }),
    /differ/,
  );
});

test("stamping migrates legacy releases, updates both lock versions, and refuses duplicate or older timestamps", async () => {
  const root = await mkdtemp(join(tmpdir(), "timestamp-version-"));
  const packagePath = join(root, "package.json");
  const lockPath = join(root, "package-lock.json");
  try {
    await writeFile(
      packagePath,
      JSON.stringify({
        name: "fixture",
        version: "0.1.0-alpha.2",
        dependencies: { example: "1.2.3" },
      }),
    );
    await writeFile(
      lockPath,
      JSON.stringify({
        version: "0.1.0-alpha.2",
        packages: {
          "": { version: "0.1.0-alpha.2" },
          "node_modules/example": { version: "1.2.3" },
        },
      }),
    );
    const result = await stampRelease(root, new Date("2026-10-01T17:12:48Z"));
    assert.deepEqual(result, {
      version: "2026.1001.171248",
      tag: "v2026.1001.171248",
      versionTimestamp: "2026-10-01T17:12:48.000Z",
    });
    const pkg = JSON.parse(await readFile(packagePath, "utf8"));
    const lock = JSON.parse(await readFile(lockPath, "utf8"));
    assert.equal(verifyVersionMetadata(pkg, lock), result.versionTimestamp);
    assert.equal(pkg.dependencies.example, "1.2.3");
    assert.equal(lock.packages["node_modules/example"].version, "1.2.3");
    for (const at of ["2026-10-01T17:12:48Z", "2026-10-01T17:12:47Z"])
      await assert.rejects(stampRelease(root, new Date(at)), /later/);
    assert.equal(
      JSON.parse(await readFile(packagePath, "utf8")).version,
      result.version,
    );
    assert.equal(
      (await stampRelease(root, new Date("2026-10-01T17:12:49Z"))).version,
      "2026.1001.171249",
    );
    lock.version = "2026.1001.171250";
    await writeFile(lockPath, JSON.stringify(lock));
    await assert.rejects(
      stampRelease(root, new Date("2026-10-01T17:12:51Z")),
      /inconsistent/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
