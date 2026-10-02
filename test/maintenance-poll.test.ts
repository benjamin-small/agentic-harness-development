import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  readFile,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  pollVersion,
  PACKAGE_NAME,
  LATEST_RELEASE_URL,
  type PollOptions,
} from "../src/maintenance/index.js";
import { runMaintenance } from "../src/maintenance/command.js";
import { toolkitRoot } from "../src/index.js";

const version = "2026.1001.171432";
const newer = "2026.1002.0";
const now = Date.parse("2026-10-03T00:00:00Z");
const json = (path: string, value: unknown) =>
  writeFile(path, JSON.stringify(value));
const response = (v = version, etag?: string) =>
  Response.json(
    { tag_name: `v${v}`, draft: false, prerelease: false },
    etag ? { headers: { etag } } : undefined,
  );
const cacheValue = (extra: object = {}) => ({
  schemaVersion: 1,
  url: LATEST_RELEASE_URL,
  checkedAt: now,
  version,
  etag: 'W/"release-1"',
  ...extra,
});

async function fixture(
  run: (
    root: string,
    options: PollOptions & { cache: string },
  ) => Promise<void>,
) {
  const root = await mkdtemp(join(tmpdir(), "harness-poll-"));
  try {
    await json(join(root, "package.json"), { name: PACKAGE_NAME, version });
    await run(root, {
      root,
      project: root,
      cache: join(root, "cache", "release.json"),
      now: () => now,
      fetch: async () => {
        throw new Error("No network in this test");
      },
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

test("poll reuses fresh public metadata without transport and rechecks pins and runtime", async () => {
  await fixture(async (root, options) => {
    let requests = 0;
    const fetcher: typeof fetch = async (url, init) => {
      requests++;
      assert.equal(url, LATEST_RELEASE_URL);
      assert.equal(init?.redirect, "error");
      assert.ok(init?.signal);
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("authorization"), null);
      assert.equal(headers.get("if-none-match"), null);
      assert.equal(init?.body, undefined);
      return response(newer, 'W/"release-1"');
    };
    await json(join(root, ".poietic-harness.json"), {
      schemaVersion: 1,
      version,
    });
    const first = await pollVersion({ ...options, fetch: fetcher });
    assert.equal(first.alignment, "aligned");
    assert.equal(first.updateAvailable, true);
    assert.equal(first.polling.cache, "written");
    const before = await readFile(options.cache, "utf8");
    assert.equal(JSON.parse(before).version, newer);
    const cached = await pollVersion({ ...options, fetch: fetcher });
    assert.equal(cached.polling.source, "cache");
    assert.equal(cached.polling.checkedAt, new Date(now).toISOString());
    assert.equal(requests, 1);
    assert.equal(await readFile(options.cache, "utf8"), before);
    await json(join(root, ".poietic-harness.json"), {
      schemaVersion: 1,
      version: newer,
    });
    const changedPin = await pollVersion(options);
    assert.equal(changedPin.relation, "behind");
    assert.equal(changedPin.expectedVersion, newer);
    await json(join(root, "package.json"), {
      name: PACKAGE_NAME,
      version: newer,
    });
    const changedRuntime = await pollVersion(options);
    assert.equal(changedRuntime.updateAvailable, false);
    assert.equal(changedRuntime.alignment, "aligned");
    await json(join(root, ".poietic-harness.json"), {
      schemaVersion: 1,
      version: "invalid",
    });
    await assert.rejects(pollVersion({ ...options, fetch: fetcher }));
    assert.equal(requests, 1);
    assert.equal(await readFile(options.cache, "utf8"), before);
  });
});

test("expired polls conditionally revalidate, refresh on 304, and replace changed releases", async () => {
  await fixture(async (_root, options) => {
    await pollVersion({
      ...options,
      fetch: async () => response(version, 'W/"release-1"'),
    });
    const later = now + 300_000;
    const refreshed = await pollVersion({
      ...options,
      now: () => later,
      fetch: async (_url, init) => {
        assert.equal(
          new Headers(init?.headers).get("if-none-match"),
          'W/"release-1"',
        );
        return new Response(null, { status: 304 });
      },
    });
    assert.equal(refreshed.polling.source, "network");
    assert.equal(refreshed.polling.cache, "written");
    assert.equal(refreshed.polling.checkedAt, new Date(later).toISOString());
    assert.equal(refreshed.updateAvailable, false);
    assert.equal(
      (await pollVersion({ ...options, now: () => later + 1 })).polling.source,
      "cache",
    );
    const changed = await pollVersion({
      ...options,
      now: () => later,
      maxAgeMs: 0,
      fetch: async () => response(newer),
    });
    assert.equal(changed.updateAvailable, true);
    assert.equal(
      JSON.parse(await readFile(options.cache, "utf8")).etag,
      undefined,
    );
    const withoutValidator = await pollVersion({
      ...options,
      now: () => later,
      maxAgeMs: 0,
      fetch: async (_url, init) => {
        assert.equal(new Headers(init?.headers).get("if-none-match"), null);
        return new Response(null, { status: 304 });
      },
    });
    assert.equal(withoutValidator.latest.status, "unavailable");
    const uncached = await pollVersion({
      root: options.root,
      project: options.root,
      fetch: async () => new Response(null, { status: 304 }),
    });
    assert.equal(uncached.updateAvailable, null);
  });
});

test("corrupt, foreign, oversized, and future-dated caches trigger a fresh lookup", async () => {
  await fixture(async (_root, options) => {
    await mkdir(join(options.root, "cache"));
    const inputs = [
      "invalid JSON",
      "x".repeat(65_537),
      "null",
      "[]",
      ...[
        { schemaVersion: 2 },
        { url: "https://untrusted.invalid/" },
        { version: "latest" },
        { checkedAt: now + 1 },
        { checkedAt: -1 },
        { checkedAt: "yesterday" },
        { etag: "invalid\r\nheader" },
        { etag: `"${"x".repeat(513)}"` },
      ].map((value) => JSON.stringify(cacheValue(value))),
    ];
    for (const input of inputs) {
      await writeFile(options.cache, input);
      const report = await pollVersion({
        ...options,
        fetch: async (_url, init) => {
          assert.equal(new Headers(init?.headers).get("if-none-match"), null);
          return response();
        },
      });
      assert.equal(report.polling.source, "network");
      assert.equal(report.polling.cache, "written");
      assert.equal(report.updateAvailable, false);
    }
    const badEtag = await pollVersion({
      ...options,
      maxAgeMs: 0,
      fetch: async () => response(version, "invalid"),
    });
    assert.equal(badEtag.updateAvailable, false);
    assert.equal(
      JSON.parse(await readFile(options.cache, "utf8")).etag,
      undefined,
    );
  });
});

test("failed refreshes and expired offline caches never masquerade as current", async () => {
  await fixture(async (root, options) => {
    await json(join(root, ".poietic-harness.json"), {
      schemaVersion: 1,
      version,
    });
    await pollVersion({ ...options, fetch: async () => response() });
    const before = await readFile(options.cache, "utf8");
    for (const status of [403, 429, 503]) {
      const failed = await pollVersion({
        ...options,
        maxAgeMs: 0,
        fetch: async () => new Response("private server details", { status }),
      });
      assert.equal(failed.alignment, "aligned");
      assert.equal(failed.updateAvailable, null);
      assert.equal(failed.polling.checkedAt, null);
      assert.equal(failed.polling.cache, "miss");
      assert.doesNotMatch(JSON.stringify(failed), /private server/);
      assert.equal(await readFile(options.cache, "utf8"), before);
    }
    assert.equal(
      (await pollVersion({ ...options, offline: true })).polling.source,
      "cache",
    );
    const expired = await pollVersion({
      ...options,
      offline: true,
      now: () => now + 300_000,
    });
    assert.equal(expired.updateAvailable, null);
    assert.equal(expired.polling.source, "none");
    await rm(options.cache);
    assert.equal(
      (await pollVersion({ ...options, offline: true })).updateAvailable,
      null,
    );
    const disabled = await pollVersion({ root, offline: true });
    assert.equal(disabled.polling.cache, "disabled");
    assert.equal(disabled.updateAvailable, null);
  });
});

test("cache writes are optional, atomic, and report failure without hiding a valid lookup", async () => {
  await fixture(async (root, options) => {
    const disabled = await pollVersion({
      root,
      project: root,
      fetch: async () => response(),
    });
    assert.equal(disabled.polling.cache, "disabled");
    assert.deepEqual(await readdir(root), ["package.json"]);
    await mkdir(options.cache, { recursive: true });
    const failed = await pollVersion({
      ...options,
      fetch: async () => response(newer),
    });
    assert.equal(failed.polling.cache, "write-failed");
    assert.equal(failed.updateAvailable, true);
    assert.deepEqual(await readdir(join(root, "cache")), ["release.json"]);
    await rm(options.cache, { recursive: true });
    const reports = await Promise.all(
      Array.from({ length: 4 }, () =>
        pollVersion({
          ...options,
          maxAgeMs: 0,
          fetch: async () => response(newer),
        }),
      ),
    );
    assert.ok(reports.every((report) => report.polling.cache === "written"));
    assert.equal(
      JSON.parse(await readFile(options.cache, "utf8")).version,
      newer,
    );
    assert.deepEqual(await readdir(join(root, "cache")), ["release.json"]);
  });
});

test("poll validates options and prevents caches from overwriting local version metadata", async () => {
  await fixture(async (root, options) => {
    for (const invalid of [
      { maxAgeMs: -1 },
      { maxAgeMs: 1.5 },
      { maxAgeMs: Infinity },
      { timeoutMs: 0 },
      { timeoutMs: 5_001 },
      { timeoutMs: NaN },
      { now: () => -1 },
      { now: () => Infinity },
      { now: () => 8_640_000_000_000_001 },
    ])
      await assert.rejects(
        pollVersion({ ...options, ...invalid }),
        /Invalid polling/,
      );
    const config = join(root, "user-pin.json");
    await json(config, { schemaVersion: 1, version });
    for (const path of [
      "package.json",
      "package-lock.json",
      ".claude-plugin/plugin.json",
      ".poietic-harness.json",
      "user-pin.json",
    ]) {
      await assert.rejects(
        pollVersion({ ...options, config, cache: join(root, path) }),
        /separate/,
      );
    }
    assert.equal(JSON.parse(await readFile(config, "utf8")).version, version);
    assert.equal(
      (await pollVersion({ ...options, config, fetch: async () => response() }))
        .alignment,
      "aligned",
    );
  });
});

test("poll bounds both stalled headers and stalled bodies with its configured deadline", async () => {
  await fixture(async (_root, options) => {
    const stalled: (typeof fetch)[] = [
      async (_url, init) =>
        new Promise((_resolve, reject) =>
          init!.signal!.addEventListener(
            "abort",
            () => reject(new Error("aborted")),
            { once: true },
          ),
        ),
      async (_url, init) =>
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
    ];
    for (const fetcher of stalled) {
      const started = Date.now();
      const report = await pollVersion({
        ...options,
        fetch: fetcher,
        timeoutMs: 20,
      });
      assert.equal(report.latest.status, "unavailable");
      assert.equal(report.updateAvailable, null);
      assert.ok(Date.now() - started < 1_000);
    }
  });
});

test("poll CLI exits track update availability independently of pin alignment", async () => {
  await fixture(async (root, options) => {
    await json(join(root, ".poietic-harness.json"), {
      schemaVersion: 1,
      version,
    });
    const args = [
      "poll",
      "--project",
      root,
      "--cache",
      options.cache,
      "--max-age",
      "0",
      "--timeout-ms",
      "100",
    ];
    for (const [remote, exitCode] of [
      [version, 0],
      [newer, 1],
      ["2026.102.304", 0],
    ] as const) {
      const result = await runMaintenance(args, root, {
        fetch: async () => response(remote),
        now: () => now,
      });
      assert.equal(result.exitCode, exitCode);
      assert.equal(result.stderr, "");
      assert.equal(JSON.parse(result.stdout).alignment, "aligned");
      assert.equal(
        JSON.parse(result.stdout).polling.checkedAt,
        new Date(now).toISOString(),
      );
    }
    const failed = await runMaintenance(args, root, { fetch: options.fetch! });
    assert.equal(failed.exitCode, 2);
    assert.equal(JSON.parse(failed.stdout).updateAvailable, null);
    for (const invalid of [
      ["poll", "--latest"],
      ["poll", "--max-age", "-1"],
      ["poll", "--max-age", "1.5"],
      ["poll", "--max-age", "1e3"],
      ["poll", "--timeout-ms", "5001"],
      ["poll", "--max-age", "9007199254740991"],
      ["check", "--cache", options.cache],
      ["check", "--max-age", "1"],
    ]) {
      const result = await runMaintenance(invalid, root);
      assert.equal(result.exitCode, 2);
      assert.equal(
        JSON.parse(result.stderr).error.code,
        "VERSION_CHECK_FAILED",
      );
    }
    await json(
      options.cache,
      cacheValue({ version: newer, checkedAt: Date.now() }),
    );
    const child = spawnSync(
      process.execPath,
      [
        join(toolkitRoot, "dist/src/maintenance/cli.js"),
        "poll",
        "--root",
        root,
        "--project",
        root,
        "--cache",
        options.cache,
        "--offline",
      ],
      { encoding: "utf8", timeout: 5_000 },
    );
    assert.equal(child.status, 1, child.stderr);
    assert.equal(JSON.parse(child.stdout).polling.source, "cache");
    assert.equal(JSON.parse(child.stdout).updateAvailable, true);
    assert.equal(
      JSON.parse(await readFile(join(root, ".poietic-harness.json"), "utf8"))
        .version,
      version,
    );
  });
});
