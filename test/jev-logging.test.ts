import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, mkdir, rm, stat } from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createJevClient, decideBatch, jevLogPath } from "../src/jev/index.js";
import { request, response } from "./jev-fixtures.js";

async function fixture(run: (path: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), "jev-persistent-log-"));
  try {
    await run(join(root, "logs", "calls.jsonl"));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
const records = async (path: string) =>
  (await readFile(path, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));

test("every library call and retry is persistently correlated without logging private contents", async () => {
  await fixture(async (logPath) => {
    let attempts = 0;
    const client = createJevClient({
      apiKey: "private-key",
      logPath,
      maxRetries: 1,
      fetch: async () => {
        const during = await records(logPath);
        assert.equal(during.at(-1).event, "jev.call.attempt");
        return ++attempts === 1
          ? new Response("private-provider-body", {
              status: 503,
              headers: { "retry-after": "0" },
            })
          : Response.json(response);
      },
    });
    assert.equal(
      (
        await client.decide({
          ...request,
          id: "private-id",
          state: "private-state",
        })
      ).ok,
      true,
    );
    const events = await records(logPath);
    assert.deepEqual(
      events.map((item) => item.event),
      [
        "jev.call.start",
        "jev.call.attempt",
        "jev.call.attempt",
        "jev.call.finish",
      ],
    );
    assert.equal(new Set(events.map((item) => item.callId)).size, 1);
    assert.deepEqual(
      events
        .filter((item) => item.event === "jev.call.attempt")
        .map((item) => item.attempt),
      [1, 2],
    );
    assert.equal(events.at(-1).attempts, 2);
    assert.equal(events.at(-1).status, "success");
    assert.equal(events.at(-1).inputTokens, 32);
    assert.equal(events.at(-1).cost, 0.0001);
    assert.doesNotMatch(
      await readFile(logPath, "utf8"),
      /private-key|private-id|private-state|private-provider-body|payments/,
    );
    assert.equal((await stat(logPath)).mode & 0o777, 0o600);
  });
});

test("concurrent calls from separate clients and invalid batch entries all append complete records", async () => {
  await fixture(async (logPath) => {
    const clients = Array.from({ length: 3 }, () =>
      createJevClient({
        apiKey: "fixture",
        logPath,
        fetch: async () => Response.json(response),
      }),
    );
    await Promise.all(
      clients.map(async (client) => {
        for await (const _result of decideBatch(client, [request, null], {
          concurrency: 2,
        })) {
          /* drain */
        }
      }),
    );
    const events = await records(logPath);
    const ids = new Set(events.map((item) => item.callId));
    assert.equal(ids.size, 6);
    for (const id of ids) {
      const call = events.filter((item) => item.callId === id);
      assert.equal(call[0].event, "jev.call.start");
      assert.equal(call.at(-1).event, "jev.call.finish");
      assert.equal(
        call.at(-1).attempts,
        call.at(-1).status === "success" ? 1 : 0,
      );
    }
    assert.equal(
      events.filter((item) => item.errorCode === "INVALID_INPUT").length,
      3,
    );
  });
});

test("logging failure blocks dispatch and reports a sanitized error without retry", async () => {
  await fixture(async (logPath) => {
    await mkdir(logPath, { recursive: true });
    let dispatches = 0;
    const result = await createJevClient({
      apiKey: "fixture",
      logPath,
      fetch: async () => {
        dispatches++;
        return Response.json(response);
      },
    }).decide(request);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, "IO_ERROR");
      assert.equal(result.error.retryable, false);
      assert.doesNotMatch(result.error.message, /jev-persistent-log/);
    }
    assert.equal(result.attempts, 0);
    assert.equal(dispatches, 0);
  });
});

test("quiet CLI calls still append to the same persistent call log", async () => {
  await fixture(async (logPath) => {
    const preload = join(logPath, "..", "..", "transport.mjs");
    const { writeFile } = await import("node:fs/promises");
    await writeFile(
      preload,
      `globalThis.fetch=async()=>Response.json(${JSON.stringify(response)});`,
    );
    const cli = new URL("../src/jev/cli.js", import.meta.url);
    const { fileURLToPath } = await import("node:url");
    for (const quiet of [false, true]) {
      const result = spawnSync(
        process.execPath,
        [
          "--import",
          preload,
          fileURLToPath(cli),
          "decide",
          "--input",
          "-",
          ...(quiet ? ["--quiet"] : []),
        ],
        {
          env: {
            ...process.env,
            OPENROUTER_API_KEY: "fixture",
            JEV_LOG_PATH: logPath,
          },
          input: JSON.stringify(request),
          encoding: "utf8",
          timeout: 5_000,
        },
      );
      assert.equal(result.status, 0, result.stderr);
      assert.equal(JSON.parse(result.stdout).ok, true);
      if (quiet) assert.equal(result.stderr, "");
    }
    const events = await records(logPath);
    assert.equal(
      events.filter((item) => item.event === "jev.call.start").length,
      2,
    );
    assert.equal(
      events.filter((item) => item.event === "jev.call.finish").length,
      2,
    );
  });
});

test("default log location is stable and path configuration must be absolute", () => {
  const previous = process.env.JEV_LOG_PATH;
  delete process.env.JEV_LOG_PATH;
  try {
    assert.equal(
      jevLogPath(),
      join(
        homedir(),
        ".local",
        "state",
        "poietic-harness",
        "jev",
        "calls.jsonl",
      ),
    );
    assert.throws(() => jevLogPath("relative.jsonl"));
    assert.throws(() => jevLogPath(""));
    assert.throws(() =>
      createJevClient({ apiKey: "fixture", logPath: "relative.jsonl" }),
    );
  } finally {
    if (previous === undefined) delete process.env.JEV_LOG_PATH;
    else process.env.JEV_LOG_PATH = previous;
  }
});
