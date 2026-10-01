import { test } from "node:test";
import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { spawn, spawnSync } from "node:child_process";
import { readFile, mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runCommand } from "../src/jev/command.js";
import { readInput, readJsonLines } from "../src/jev/input.js";
import { LIMITS, type DecisionResult } from "../src/jev/index.js";
import { request, response, goodFetch, transport } from "./jev-fixtures.js";

const bin = fileURLToPath(new URL("../src/jev/cli.js", import.meta.url));
const noKeyEnv = { ...process.env, OPENROUTER_API_KEY: "" };
function capture() {
  let content = "";
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      content += chunk.toString();
      callback();
    },
  });
  return { stream, text: () => content };
}
async function command(
  args: string[],
  content = JSON.stringify(request),
  apiKey = "fixture",
  fetch = goodFetch,
  signal?: AbortSignal,
) {
  const stdout = capture();
  const stderr = capture();
  const status = await runCommand(args, {
    stdin: Readable.from([content]),
    stdout: stdout.stream,
    stderr: stderr.stream,
    apiKey,
    fetch,
    ...(signal ? { signal } : {}),
  });
  return { status, stdout: stdout.text(), stderr: stderr.text() };
}

test("installed-style CLI entry reports version, help, validation, and sanitized setup errors", async () => {
  const pkg = JSON.parse(
    await readFile(new URL("../../package.json", import.meta.url), "utf8"),
  ) as { version: string };
  const run = (args: string[], input = "") =>
    spawnSync(process.execPath, [bin, ...args], {
      input,
      env: noKeyEnv,
      encoding: "utf8",
    });
  assert.equal(run(["--version"]).stdout.trim(), pkg.version);
  assert.match(run(["--help"]).stdout, /Usage: jev/);
  const valid = run(["validate", "--input", "-"], JSON.stringify(request));
  assert.equal(valid.status, 0, valid.stderr);
  assert.deepEqual(JSON.parse(valid.stdout), {
    schemaVersion: 1,
    valid: true,
    requestId: request.id,
    questionIds: ["team", "urgency", "is_bug"],
  });
  const missingKey = run(["decide", "--input", "-"], JSON.stringify(request));
  assert.equal(missingKey.status, 2);
  assert.equal(missingKey.stdout, "");
  assert.equal(JSON.parse(missingKey.stderr).error.code, "MISSING_CREDENTIALS");
  for (const args of [
    [],
    ["secret-command"],
    ["decide"],
    ["decide", "--secret-key", "secret-value"],
    ["validate", "--input", "-", "--concurrency", "4"],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
    assert.doesNotMatch(result.stderr, /secret-command|secret-value/);
  }
});

test("CLI decide and batch use the shared client and JSON result channels", async () => {
  const single = await command([
    "decide",
    "--input",
    "-",
    "--max-retries",
    "0",
    "--timeout-ms",
    "1000",
  ]);
  assert.equal(single.status, 0);
  assert.equal(single.stderr, "");
  assert.equal((JSON.parse(single.stdout) as DecisionResult).ok, true);
  const failed = await command(
    ["decide", "--input", "-"],
    JSON.stringify(request),
    "fixture",
    transport(() => new Response("private body", { status: 401 })),
  );
  assert.equal(failed.status, 1);
  assert.equal(failed.stderr, "");
  assert.equal(JSON.parse(failed.stdout).error.code, "AUTHENTICATION");
  const batch = await command(
    ["batch", "--input", "-", "--concurrency", "2"],
    `${JSON.stringify(request)}\ninvalid\n\n${JSON.stringify({ ...request, id: "last" })}`,
  );
  assert.equal(batch.status, 1);
  assert.equal(batch.stderr, "");
  const results = batch.stdout
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line) as DecisionResult & { sequence: number });
  assert.equal(results.length, 3);
  assert.equal(results.find((r) => r.sequence === 1)?.ok, false);
  assert.equal(results.find((r) => r.sequence === 2)?.requestId, "last");
  assert.equal((await command(["batch", "--input", "-"], "")).status, 0);
});

test("CLI rejects invalid bounds, JSON, and unavailable files without exposing input", async () => {
  for (const args of [
    ["decide", "--input", "-", "--max-retries", "6"],
    ["decide", "--input", "-", "--timeout-ms", "0"],
    ["batch", "--input", "-", "--concurrency", "1.5"],
    ["batch", "--input", "-", "--concurrency", "99"],
  ]) {
    const result = await command(args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, "");
  }
  const bad = await command(
    ["validate", "--input", "-"],
    "PRIVATE INVALID JSON",
  );
  assert.equal(bad.status, 2);
  assert.doesNotMatch(bad.stderr, /PRIVATE/);
  assert.equal(
    (await command(["decide", "--input", "-"], "invalid")).status,
    1,
  );
  const missing = await command([
    "decide",
    "--input",
    "/no-such-fixture/private.json",
  ]);
  assert.equal(missing.status, 1);
  assert.doesNotMatch(missing.stderr, /private\.json/);
  const dir = await mkdtemp(join(tmpdir(), "jev-input-"));
  try {
    const file = join(dir, "request.json");
    await writeFile(file, JSON.stringify(request));
    assert.equal((await command(["decide", "--input", file])).status, 0);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("input readers bound bytes and handle split UTF-8, CRLF, blanks, malformed and oversized lines", async () => {
  await assert.rejects(
    readInput(Readable.from(["x".repeat(LIMITS.inputBytes + 1)])),
    /1 MiB/,
  );
  const unicode = { ...request, state: "café" };
  const encoded = Buffer.from(JSON.stringify(unicode));
  const split = encoded.indexOf(Buffer.from("é")) + 1;
  const lines: unknown[] = [];
  for await (const line of readJsonLines(
    Readable.from([
      encoded.subarray(0, split),
      encoded.subarray(split),
      Buffer.from("\r\n\n"),
      Buffer.from("x".repeat(LIMITS.inputBytes)),
      Buffer.from("x\nnull\nnotjson\n"),
    ]),
  ))
    lines.push(line);
  assert.deepEqual(lines, [unicode, null, null, null]);
  assert.deepEqual(
    await readInput(
      Readable.from([encoded.subarray(0, split), encoded.subarray(split)]),
    ),
    unicode,
  );
});

test("command cancellation and IO failures are structured", async () => {
  const controller = new AbortController();
  controller.abort();
  const cancelled = await command(
    ["decide", "--input", "-"],
    JSON.stringify(request),
    "fixture",
    goodFetch,
    controller.signal,
  );
  assert.equal(JSON.parse(cancelled.stderr).error.code, "CANCELLED");
  const stdout = capture();
  const stderr = capture();
  const broken = new Readable({
    read() {
      this.destroy(new Error("private path"));
    },
  });
  assert.equal(
    await runCommand(["batch", "--input", "-"], {
      stdin: broken,
      stdout: stdout.stream,
      stderr: stderr.stream,
      apiKey: "fixture",
      fetch: goodFetch,
    }),
    1,
  );
  assert.equal(JSON.parse(stderr.text()).error.code, "IO_ERROR");
  const brokenOut = new Writable({
    write(_chunk, _encoding, callback) {
      callback(new Error("private pipe"));
    },
  });
  brokenOut.on("error", () => {});
  assert.equal(
    await runCommand(["decide", "--input", "-"], {
      stdin: Readable.from([JSON.stringify(request)]),
      stdout: brokenOut,
      stderr: stderr.stream,
      apiKey: "fixture",
      fetch: goodFetch,
    }),
    1,
  );
});

test("invalid UTF-8 is rejected without silently changing request state", async () => {
  const bytes = Buffer.concat([
    Buffer.from('{"id":"utf8","state":"'),
    Buffer.from([0xff]),
    Buffer.from('","questions":{"q":{"type":"noul","instructions":"Test"}}}'),
  ]);
  await assert.rejects(readInput(Readable.from([bytes])), /UTF-8/);
  const results: unknown[] = [];
  for await (const item of readJsonLines(Readable.from([bytes])))
    results.push(item);
  assert.deepEqual(results, [null]);
});

test("CLI SIGINT and SIGTERM terminate blocked input with conventional exits", async () => {
  for (const signal of ["SIGINT", "SIGTERM"] as const) {
    const child = spawn(process.execPath, [bin, "validate", "--input", "-"], {
      env: noKeyEnv,
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    // The request remains incomplete; give the Node entrypoint time to install handlers.
    await new Promise((resolve) => setTimeout(resolve, 150));
    child.kill(signal);
    const result = await new Promise<number | null>((resolve) =>
      child.once("exit", resolve),
    );
    assert.equal(result, signal === "SIGINT" ? 130 : 143, stderr);
    assert.equal(JSON.parse(stderr).error.code, "CANCELLED");
  }
});

test("CLI explicit transport retry option reaches the library", async () => {
  let count = 0;
  const result = await command(
    [
      "decide",
      "--input",
      "-",
      "--retry-transport-errors",
      "--max-retries",
      "1",
    ],
    JSON.stringify(request),
    "fixture",
    transport(() => {
      if (++count === 1) throw new Error("temporary");
      return Response.json(response);
    }),
  );
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).attempts, 2);
});

test("a blocked output consumer prevents unbounded batch admission", async () => {
  let markBlocked!: () => void;
  const blocked = new Promise<void>((resolve) => {
    markBlocked = resolve;
  });
  let release!: () => void;
  let first = true;
  let calls = 0;
  const stdout = new Writable({
    write(_chunk, _encoding, callback) {
      if (first) {
        first = false;
        release = callback;
        markBlocked();
      } else callback();
    },
  });
  const stderr = capture();
  const pending = runCommand(["batch", "--input", "-", "--concurrency", "3"], {
    stdin: Readable.from([
      Array.from({ length: 20 }, () => JSON.stringify(request)).join("\n"),
    ]),
    stdout,
    stderr: stderr.stream,
    apiKey: "fixture",
    fetch: transport(() => {
      calls++;
      return Response.json(response);
    }),
  });
  await blocked;
  await new Promise((resolve) => setImmediate(resolve));
  assert.ok(calls <= 3, `Scheduled ${calls} requests while output was blocked`);
  release();
  assert.equal(await pending, 0);
  assert.equal(calls, 20);
  assert.equal(stderr.text(), "");
});
