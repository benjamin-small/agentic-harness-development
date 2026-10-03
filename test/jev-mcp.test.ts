import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
  chmod,
  symlink,
  mkdir,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { once } from "node:events";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createJevServer, type JevServerOptions } from "../src/jev/mcp.js";
import { request, response } from "./jev-fixtures.js";

async function harness(
  t: TestContext,
  options: Partial<JevServerOptions> = {},
) {
  const root = await mkdtemp(join(tmpdir(), "jev-mcp-"));
  const logPath = join(root, "calls.jsonl");
  const server = createJevServer({
    version: "fixture",
    apiKey: "fixture",
    logPath,
    fetch: async () => Response.json(response),
    ...options,
  });
  const client = new Client({ name: "test", version: "1" });
  const [left, right] = InMemoryTransport.createLinkedPair();
  await server.connect(left);
  await client.connect(right);
  t.after(async () => {
    await client.close();
    await server.close();
    await rm(root, { recursive: true, force: true });
  });
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const value = await client.callTool({ name, arguments: args });
    const data = value.structuredContent as Record<string, any>;
    assert.deepEqual(
      JSON.parse((value.content as { text: string }[])[0]!.text),
      data,
    );
    return { data, isError: value.isError };
  };
  return { call, client, logPath, server };
}
test("MCP discovery and offline status do not dispatch; schema and data scopes fail closed", async (t) => {
  let dispatches = 0;
  const h = await harness(t, {
    fetch: async () => {
      dispatches++;
      return Response.json(response);
    },
  });
  assert.equal((await h.client.listTools()).tools.length, 6);
  assert.equal((await h.call("jev_status")).data.liveVerified, false);
  assert.equal(
    (await h.call("jev_decide", { dataScope: "private", request })).data
      .unavailable,
    "data_scope",
  );
  assert.equal(
    (
      await h.call("jev_decide", {
        dataScope: "synthetic",
        request,
        apiKey: "escape",
      })
    ).isError,
    true,
  );
  assert.equal(
    (await h.call("jev_decide", { dataScope: "synthetic", request: {} }))
      .isError,
    true,
  );
  assert.equal((await h.call("unknown")).isError, true);
  assert.equal(
    (
      await h.call("jev_batch", {
        dataScope: "synthetic",
        requests: [request, {}],
      })
    ).isError,
    true,
  );
  assert.equal(dispatches, 0);
  const missing = await harness(t, { apiKey: "" });
  assert.equal(
    (await missing.call("jev_decide", { dataScope: "synthetic", request })).data
      .unavailable,
    "credentials",
  );
  assert.throws(() =>
    createJevServer({
      version: "1",
      logPath: h.logPath,
      allowedDataScopes: [],
    }),
  );
});
test("MCP shares decision validation, call correlation, safe outcome recording and one-attempt policy", async (t) => {
  const h = await harness(t);
  const result = await h.call("jev_decide", {
    dataScope: "synthetic",
    request,
  });
  assert.equal(result.data.ok, true);
  assert.equal(result.data.attempts, 1);
  assert.equal(
    (
      await h.call("jev_record_outcome", {
        callId: result.data.callId,
        outcome: "used",
        reason: "accepted",
      })
    ).data.recorded,
    true,
  );
  assert.equal(
    (
      await h.call("jev_record_outcome", {
        callId: result.data.callId,
        outcome: "used",
        reason: "accepted",
      })
    ).isError,
    true,
  );
  assert.equal(
    (
      await h.call("jev_record_outcome", {
        outcome: "unavailable",
        reason: "permission",
      })
    ).data.recorded,
    true,
  );
  const events = (await readFile(h.logPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(events[0].surface, "mcp");
  assert.equal(events[0].callId, result.data.callId);
  let calls = 0;
  const failure = await harness(t, {
    fetch: async () => {
      calls++;
      return new Response("private provider failure", { status: 503 });
    },
  });
  const failed = await failure.call("jev_decide", {
    dataScope: "synthetic",
    request,
  });
  assert.equal(failed.isError, true);
  assert.equal(calls, 1);
  assert.equal(
    (
      await failure.call("jev_record_outcome", {
        callId: failed.data.callId,
        outcome: "used",
        reason: "accepted",
      })
    ).isError,
    true,
  );
});
test("MCP recipes and partial batches retain answer and sequence identities", async (t) => {
  const h = await harness(t, {
    fetch: async (_url, init) => {
      const body = JSON.parse(init!.body as string);
      if (body.state === "fail") return new Response("", { status: 401 });
      return Response.json({
        ...response,
        answers: Object.fromEntries(
          Object.entries(body.questions).map(([id, q]) => [
            id,
            {
              type: "choice",
              choice: Object.keys((q as { criteria: object }).criteria)[0],
            },
          ]),
        ),
      });
    },
  });
  const e = await h.call("jev_evidence_relevance", {
    dataScope: "synthetic",
    id: "e",
    objective: "Test",
    items: [{ id: "i", text: "Evidence" }],
  });
  assert.equal(e.data.response.answers.i.choice, "relevant");
  const f = await h.call("jev_finding_support", {
    dataScope: "synthetic",
    id: "f",
    findings: [{ id: "i", claim: "Claim", evidence: "Evidence" }],
  });
  assert.equal(f.data.response.answers.i.choice, "supported");
  const batch = await h.call("jev_batch", {
    dataScope: "synthetic",
    requests: [
      {
        id: "a",
        state: "ok",
        questions: {
          i: { type: "choice", instructions: "Select", criteria: { a: "A" } },
        },
      },
      { ...request, state: "fail" },
    ],
  });
  assert.equal(batch.data.ok, false);
  assert.deepEqual(
    batch.data.results.map((r: any) => r.sequence).sort(),
    [0, 1],
  );
  assert.equal(batch.data.results.find((r: any) => r.sequence === 0).ok, true);
  assert.equal(
    batch.data.results.find((r: any) => r.sequence === 1).error.code,
    "AUTHENTICATION",
  );
});
test("MCP limits overlapping invocations and cancels active transport on disconnect", async (t) => {
  let start!: () => void;
  const started = new Promise<void>((resolve) => {
    start = resolve;
  });
  let cancel!: () => void;
  const cancelled = new Promise<void>((resolve) => {
    cancel = resolve;
  });
  const h = await harness(t, {
    fetch: async (_url, init) => {
      start();
      return await new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener(
          "abort",
          () => {
            cancel();
            reject(new Error("cancelled"));
          },
          { once: true },
        );
      });
    },
  });
  const pending = h
    .call("jev_decide", { dataScope: "synthetic", request })
    .catch(() => undefined);
  await started;
  assert.equal(
    (await h.call("jev_decide", { dataScope: "synthetic", request })).data
      .unavailable,
    "busy",
  );
  await h.server.close();
  await cancelled;
  await pending;
});

test("installed-style stdio entrypoint exposes offline tools and enforces credential file hygiene", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "jev-stdio-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL("../src/jev/mcp-cli.js", import.meta.url));
  const env = {
    PATH: process.env.PATH ?? "",
    JEV_LOG_PATH: join(root, "calls.jsonl"),
  };
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [cli],
    env,
    stderr: "pipe",
  });
  const client = new Client({ name: "stdio-test", version: "1" });
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 6);
  assert.equal(
    (
      (await client.callTool({ name: "jev_status", arguments: {} }))
        .structuredContent as Record<string, unknown>
    ).configured,
    false,
  );
  await client.close();
  const run = (args: string[], extra: Record<string, string> = {}) =>
    spawnSync(process.execPath, [cli, ...args], {
      env: { ...env, ...extra },
      input: "",
      encoding: "utf8",
      timeout: 5000,
    });
  assert.match(run(["--version"]).stdout, /^\d+\.\d+\.\d+/);
  assert.equal(run(["bad"]).status, 2);
  const key = join(root, "key");
  await writeFile(key, "fixture\n", { mode: 0o600 });
  assert.equal(run([], { JEV_API_KEY_FILE: key }).status, 0);
  assert.equal(
    run([], { JEV_API_KEY_FILE: key, OPENROUTER_API_KEY: "fixture" }).status,
    2,
  );
  await chmod(key, 0o644);
  const insecure = run([], { JEV_API_KEY_FILE: key });
  assert.equal(insecure.status, 2);
  assert.doesNotMatch(insecure.stderr, /fixture/);
  await chmod(key, 0o600);
  await symlink(key, join(root, "link"));
  assert.equal(run([], { JEV_API_KEY_FILE: join(root, "link") }).status, 2);
  await writeFile(key, "");
  assert.equal(run([], { JEV_API_KEY_FILE: key }).status, 2);
  assert.equal(run([], { JEV_ALLOWED_DATA_SCOPES: "everything" }).status, 2);
  const fifo = join(root, "fifo");
  assert.equal(spawnSync("mkfifo", [fifo]).status, 0);
  await chmod(fifo, 0o600);
  const invalidFifo = run([], { JEV_API_KEY_FILE: fifo });
  assert.equal(invalidFifo.status, 2);
  assert.match(invalidFifo.stderr, /regular file/);
});

test("concurrent feedback consumes an ID once, including ambiguous persistence failures", async (t) => {
  const h = await harness(t);
  const result = await h.call("jev_decide", {
    dataScope: "synthetic",
    request,
  });
  const outcomes = await Promise.all(
    Array.from({ length: 8 }, (_, i) =>
      h.call("jev_record_outcome", {
        callId: result.data.callId,
        outcome: i % 2 ? "overridden" : "used",
        reason: i % 2 ? "contrary_evidence" : "accepted",
      }),
    ),
  );
  assert.equal(outcomes.filter((r) => r.data.recorded).length, 1);
  const rows = (await readFile(h.logPath, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.equal(rows.filter((r) => r.event === "jev.outcome").length, 1);
  const next = await h.call("jev_decide", { dataScope: "synthetic", request });
  await rm(h.logPath);
  await mkdir(h.logPath);
  const failed = await h.call("jev_record_outcome", {
    callId: next.data.callId,
    outcome: "used",
    reason: "accepted",
  });
  assert.equal(failed.data.error.code, "IO_ERROR");
  const repeated = await h.call("jev_record_outcome", {
    callId: next.data.callId,
    outcome: "used",
    reason: "accepted",
  });
  assert.equal(repeated.data.error.code, "INVALID_INPUT");
});

test("internal batch deadline returns partial results normally before host cancellation", async (t) => {
  let calls = 0;
  const h = await harness(t, {
    batchTimeoutMs: 1000,
    fetch: async (_url, init) => {
      calls++;
      if (JSON.parse(init!.body as string).state === "fast")
        return Response.json(response);
      return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
    },
  });
  const result = await h.call("jev_batch", {
    dataScope: "synthetic",
    requests: Array.from({ length: 8 }, (_, i) => ({
      ...request,
      state: i === 0 ? "fast" : "slow",
    })),
  });
  assert.equal(result.data.deadlineExpired, true);
  assert.equal(result.data.cancelled, true);
  assert.equal(result.data.requested, 8);
  assert.equal(result.data.results.filter((r: any) => r.ok).length, 1);
  assert.equal(result.data.results.find((r: any) => r.ok).sequence, 0);
  assert.equal(calls, 3);
  assert.equal((await h.call("jev_status")).data.busy, false);
  assert.throws(() =>
    createJevServer({
      version: "test",
      logPath: h.logPath,
      batchTimeoutMs: 60_000,
    }),
  );
});

test("native request cancellation aborts work but cannot return partial MCP answers", async (t) => {
  let calls = 0;
  const h = await harness(t, {
    fetch: async (_url, init) => {
      if (++calls === 1) return Response.json(response);
      return new Promise<Response>((_resolve, reject) => {
        init!.signal!.addEventListener(
          "abort",
          () => reject(new Error("aborted")),
          { once: true },
        );
      });
    },
  });
  const controller = new AbortController();
  const pending = h.client.callTool(
    {
      name: "jev_batch",
      arguments: { dataScope: "synthetic", requests: [request, request] },
    },
    undefined,
    { signal: controller.signal },
  );
  const rejected = assert.rejects(pending);
  const until = Date.now() + 5000;
  while (true) {
    let log = "";
    try {
      log = await readFile(h.logPath, "utf8");
    } catch {
      /* wait for first write */
    }
    if (log.includes('"status":"success"') && calls === 2) break;
    assert.ok(Date.now() < until, "first batch result did not complete");
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  controller.abort();
  await rejected;
  while ((await h.call("jev_status")).data.busy) {
    assert.ok(Date.now() < until, "cancellation did not clear admission");
    await new Promise((resolve) => setTimeout(resolve, 2));
  }
  assert.equal(calls, 2);
  const log = await readFile(h.logPath, "utf8");
  assert.match(log, /CANCELLED/);
});

test(
  "stdio EOF aborts admitted batch work and stops further provider dispatch",
  { timeout: 5000 },
  async (t) => {
    const root = await mkdtemp(join(tmpdir(), "jev-eof-"));
    const cli = fileURLToPath(
      new URL("../src/jev/mcp-cli.js", import.meta.url),
    );
    const preload = join(root, "provider.mjs");
    const logPath = join(root, "calls.jsonl");
    await writeFile(
      preload,
      `globalThis.fetch=async(_url,init)=>{process.stderr.write('provider-start\\n');return new Promise((resolve,reject)=>init.signal.addEventListener('abort',()=>{process.stderr.write('provider-abort\\n');reject(new Error('aborted'));},{once:true}));};`,
    );
    const child = spawn(process.execPath, ["--import", preload, cli], {
      env: {
        PATH: process.env.PATH ?? "",
        OPENROUTER_API_KEY: "fixture",
        JEV_LOG_PATH: logPath,
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    t.after(async () => {
      child.kill("SIGKILL");
      await rm(root, { recursive: true, force: true });
    });
    const exited = once(child, "exit");
    let stderr = "";
    let admit!: () => void;
    const admitted = new Promise<void>((resolve) => {
      admit = resolve;
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.split("provider-start").length === 3) admit();
    });
    const send = (value: unknown) =>
      child.stdin.write(JSON.stringify(value) + "\n");
    let stdout = "",
      sent = false;
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
      if (!sent && stdout.includes('"id":1')) {
        sent = true;
        send({ jsonrpc: "2.0", method: "notifications/initialized" });
        send({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/call",
          params: {
            name: "jev_batch",
            arguments: {
              dataScope: "synthetic",
              requests: Array.from({ length: 8 }, () => request),
            },
          },
        });
      }
    });
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "eof-test", version: "1" },
      },
    });
    await admitted;
    child.stdin.end();
    const [code] = await exited;
    assert.equal(code, 0, stderr);
    assert.equal(stderr.split("provider-abort").length - 1, 2);
    const rows = (await readFile(logPath, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(rows.filter((r) => r.event === "jev.call.attempt").length, 2);
    assert.equal(rows.filter((r) => r.errorCode === "CANCELLED").length, 2);
  },
);
