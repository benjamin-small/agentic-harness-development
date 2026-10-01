import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import {
  checkVersion,
  validatePin,
  versionTime,
  sessionContext,
  PACKAGE_NAME,
  LATEST_RELEASE_URL,
  type CheckOptions,
} from "../src/maintenance/index.js";
import { runMaintenance } from "../src/maintenance/command.js";
import { toolkitRoot } from "../src/index.js";

const version = "2026.1001.171432";
const newer = "2026.1002.0";
const noNetwork: typeof fetch = async () => {
  throw new Error("Network must not run");
};
const release =
  (v = version): typeof fetch =>
  async (url, init) => {
    assert.equal(url, LATEST_RELEASE_URL);
    assert.equal(init?.redirect, "error");
    assert.ok(init?.signal);
    assert.equal(new Headers(init?.headers).get("Authorization"), null);
    return Response.json({
      tag_name: `v${v}`,
      draft: false,
      prerelease: false,
    });
  };

async function fixture(
  run: (root: string, options: CheckOptions) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "harness-version-"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: PACKAGE_NAME, version }),
  );
  try {
    await run(root, { root, project: root, fetch: noNetwork });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const json = (root: string, path: string, value: unknown) =>
  writeFile(join(root, path), JSON.stringify(value));

test("timestamp validation rejects ranges, malformed dates, and noncanonical groups", () => {
  assert.equal(
    new Date(versionTime("2026.102.304")).toISOString(),
    "2026-01-02T00:03:04.000Z",
  );
  for (const value of [
    null,
    12,
    "^2026.1001.0",
    "2026.0101.0",
    "2026.101.000000",
    "2026.230.0",
    "2026.1232.0",
    "2026.101.240000",
  ])
    assert.throws(() => versionTime(value), /Invalid timestamp/);
  assert.deepEqual(validatePin({ schemaVersion: 1, version }), {
    schemaVersion: 1,
    version,
  });
  for (const value of [
    null,
    [],
    "pin",
    {},
    { schemaVersion: 2, version },
    { schemaVersion: 1, version, extra: true },
    { schemaVersion: 1, version: "latest" },
  ])
    assert.throws(() => validatePin(value));
});

test("pins check locally; newer availability does not change alignment to an older pin", async () => {
  await fixture(async (root, options) => {
    await json(root, ".poietic-harness.json", { schemaVersion: 1, version });
    const pinned = await checkVersion(options);
    assert.equal(pinned.alignment, "aligned");
    assert.equal(pinned.targetSource, "pin");
    assert.equal(pinned.latest.status, "not-checked");
    assert.equal(pinned.updateAvailable, null);
    const report = await checkVersion({
      ...options,
      latest: true,
      fetch: release(newer),
    });
    assert.equal(report.alignment, "aligned");
    assert.equal(report.expectedVersion, version);
    assert.equal(report.updateAvailable, true);
    assert.match(sessionContext(report), /New release 2026.1002.0/);
    assert.equal(report.integrity, "not-checked");
  });
});

test("unconfigured offline is unknown; latest and explicit targets compare numerically", async () => {
  await fixture(async (root, options) => {
    const unknown = await checkVersion({ ...options, offline: true });
    assert.equal(unknown.alignment, "unknown");
    assert.equal(unknown.targetSource, "none");
    assert.equal(unknown.expectedVersion, null);
    assert.match(sessionContext(unknown), /no known target/);
    const behind = await checkVersion({ ...options, fetch: release(newer) });
    assert.equal(behind.relation, "behind");
    assert.equal(behind.targetSource, "latest");
    assert.equal(behind.alignment, "mismatch");
    const same = await checkVersion({ ...options, fetch: release() });
    assert.equal(same.alignment, "aligned");
    assert.equal(same.updateAvailable, false);
    const ahead = await checkVersion({
      ...options,
      fetch: release("2026.102.304"),
    });
    assert.equal(ahead.relation, "ahead");
    assert.equal(ahead.updateAvailable, false);
    await json(root, "user-pin.json", { schemaVersion: 1, version: newer });
    assert.equal(
      (await checkVersion({ ...options, config: join(root, "user-pin.json") }))
        .relation,
      "behind",
    );
    await writeFile(join(root, ".poietic-harness.json"), "invalid project pin");
    assert.equal(
      (await checkVersion({ ...options, expected: version })).alignment,
      "aligned",
    );
    await assert.rejects(checkVersion(options), /metadata/);
    await assert.rejects(
      checkVersion({ ...options, config: join(root, "missing.json") }),
      /metadata/,
    );
    await assert.rejects(
      checkVersion({ ...options, offline: true, latest: true }),
      /Choose/,
    );
    await assert.rejects(
      checkVersion({ ...options, expected: version, config: "pin" }),
      /Choose/,
    );
  });
});

test("malformed or conflicting local metadata fails closed with no remote fallback", async () => {
  await fixture(async (root, options) => {
    await json(root, "package-lock.json", {
      version,
      packages: { "": { version } },
    });
    await mkdir(join(root, ".claude-plugin"));
    await json(root, ".claude-plugin/plugin.json", {
      name: "poietic-harness",
      version,
    });
    assert.equal(
      (await checkVersion({ ...options, expected: version })).alignment,
      "aligned",
    );
    for (const value of [
      null,
      { version: newer },
      { version, packages: { "": { version: newer } } },
    ]) {
      await json(root, "package-lock.json", value);
      await assert.rejects(checkVersion(options), /lockfile/);
    }
    await rm(join(root, "package-lock.json"));
    for (const value of [
      null,
      { name: "other", version },
      { name: "poietic-harness", version: newer },
    ]) {
      await json(root, ".claude-plugin/plugin.json", value);
      await assert.rejects(checkVersion(options), /Plugin/);
    }
    await rm(join(root, ".claude-plugin"), { recursive: true });
    await writeFile(join(root, ".poietic-harness.json"), "x".repeat(65_537));
    await assert.rejects(checkVersion(options), /metadata/);
    await rm(join(root, ".poietic-harness.json"));
    for (const value of [
      null,
      { name: "wrong", version },
      { name: PACKAGE_NAME, version: "latest" },
    ]) {
      await json(root, "package.json", value);
      await assert.rejects(checkVersion(options));
    }
  });
});

test("release lookup handles HTTP failures, invalid payloads, and bounded bodies without leaking remote data", async () => {
  await fixture(async (_root, options) => {
    for (const status of [403, 404, 429, 500]) {
      const report = await checkVersion({
        ...options,
        fetch: async () => new Response("sensitive", { status }),
      });
      assert.deepEqual(report.latest, {
        status: "unavailable",
        reason: `GitHub HTTP ${status}`,
      });
      assert.equal(report.alignment, "unknown");
    }
    const transports: (typeof fetch)[] = [
      noNetwork,
      async () => new Response(null),
      async () => new Response("sensitive invalid JSON"),
      async () => new Response("x".repeat(262_145)),
      ...[
        null,
        {},
        { tag_name: `v${version}`, draft: true, prerelease: false },
        { tag_name: version, draft: false, prerelease: false },
        { tag_name: "v0.1.0-alpha.2", draft: false, prerelease: true },
        { tag_name: "vbad", draft: false, prerelease: false },
      ].map((value) => (async () => Response.json(value)) as typeof fetch),
    ];
    for (const transport of transports) {
      const report = await checkVersion({ ...options, fetch: transport });
      assert.equal(report.latest.status, "unavailable");
      assert.doesNotMatch(JSON.stringify(report), /sensitive/);
      assert.match(sessionContext(report), /lookup unavailable/);
    }
    const pinned = await checkVersion({
      ...options,
      expected: version,
      latest: true,
      fetch: noNetwork,
    });
    assert.equal(pinned.alignment, "aligned");
    assert.equal(pinned.latest.status, "unavailable");
  });
});

test("release lookup aborts a stalled response within its deadline", async () => {
  await fixture(async (_root, options) => {
    const started = Date.now();
    const report = await checkVersion({
      ...options,
      fetch: async (_url, init) =>
        new Response(
          new ReadableStream({
            start(controller) {
              init!.signal!.addEventListener(
                "abort",
                () => controller.error(new Error("aborted")),
                { once: true },
              );
            },
          }),
        ),
    });
    assert.equal(report.latest.status, "unavailable");
    assert.ok(Date.now() - started < 8_000);
  });
});

test("CLI and hook distinguish checks from fail-soft startup context", async () => {
  await fixture(async (root) => {
    for (const args of [[], ["--help"]])
      assert.match((await runMaintenance(args, root)).stdout, /Read-only/);
    const common = ["--root", root, "--project", root];
    for (const [expected, exitCode] of [
      [version, 0],
      [newer, 1],
    ] as const) {
      const output = await runMaintenance(
        ["check", ...common, "--expected", expected, "--offline"],
        root,
      );
      assert.equal(output.exitCode, exitCode);
      assert.equal(output.stderr, "");
      assert.equal(JSON.parse(output.stdout).installedVersion, version);
    }
    const unknown = await runMaintenance(
      ["check", ...common, "--offline"],
      root,
    );
    assert.equal(unknown.exitCode, 2);
    for (const args of [
      ["update"],
      ["check", "extra"],
      ["check", "--unknown"],
      ["check", ...common, "--config", join(root, "missing")],
    ]) {
      const output = await runMaintenance(args, root);
      assert.equal(output.exitCode, 2);
      assert.equal(output.stdout, "");
      assert.equal(
        JSON.parse(output.stderr).error.code,
        "VERSION_CHECK_FAILED",
      );
    }
    const hook = await runMaintenance(
      ["session-start", ...common, "--offline"],
      root,
    );
    assert.equal(hook.exitCode, 0);
    assert.equal(
      JSON.parse(hook.stdout).hookSpecificOutput.hookEventName,
      "SessionStart",
    );
    assert.match(hook.stdout, /unknown/);
    const failed = await runMaintenance(
      ["session-start", "--root", join(root, "missing")],
      root,
    );
    assert.equal(failed.exitCode, 0);
    assert.match(failed.stdout, /unavailable/);
    const live = await runMaintenance(["check", ...common, "--latest"], root, {
      fetch: release(),
    });
    assert.equal(live.exitCode, 0);
  });
});

test("generated Claude plugin ships only maintenance and its real exec hook checks the project pin", async () => {
  await fixture(async (root) => {
    const plugin = join(toolkitRoot, "dist/claude-plugin/poietic-harness");
    const manifest = JSON.parse(
      await readFile(join(plugin, ".claude-plugin/plugin.json"), "utf8"),
    );
    const standalone = spawnSync(
      process.execPath,
      [
        join(toolkitRoot, "dist/src/maintenance/cli.js"),
        "check",
        "--expected",
        manifest.version,
        "--offline",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(standalone.status, 0, standalone.stderr);
    assert.equal(JSON.parse(standalone.stdout).alignment, "aligned");
    await json(root, ".poietic-harness.json", {
      schemaVersion: 1,
      version: manifest.version,
    });
    const hooks = JSON.parse(
      await readFile(join(plugin, "hooks/hooks.json"), "utf8"),
    );
    const entry = hooks.hooks.SessionStart[0];
    assert.equal(entry.matcher, "startup|resume|clear|fork");
    const hook = entry.hooks[0];
    const args = hook.args.map((s: string) =>
      s
        .replaceAll("${CLAUDE_PLUGIN_ROOT}", plugin)
        .replaceAll("${CLAUDE_PROJECT_DIR}", root),
    );
    const result = spawnSync(process.execPath, args, {
      cwd: root,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(hook.command, "node");
    assert.equal(result.status, 0, result.stderr);
    assert.match(
      JSON.parse(result.stdout).hookSpecificOutput.additionalContext,
      /aligned \(equal\)/,
    );
    const entrypoint = await readFile(
      join(plugin, "skills/update/SKILL.md"),
      "utf8",
    );
    assert.match(entrypoint, /name: update/);
    await assert.rejects(
      readFile(join(plugin, "skills/ui-standards/SKILL.md")),
      /ENOENT/,
    );
    await assert.rejects(
      readFile(join(plugin, "agents/ui-reviewer/AGENT.md")),
      /ENOENT/,
    );
  });
});
