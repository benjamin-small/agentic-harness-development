import { test } from "node:test";
import assert from "node:assert/strict";
import {
  createJevClient,
  decideBatch,
  validateRequest,
  parseInput,
  JEV_MODEL,
  JEV_ENDPOINT,
  LIMITS,
  JevError,
  type DecisionResult,
} from "../src/jev/index.js";
import { retryDelay, withSignal } from "../src/jev/client.js";
import { validateResponse } from "../src/jev/validation.js";
import { request, response, transport, goodFetch } from "./jev-fixtures.js";

const client = (fetch = goodFetch, options = {}) =>
  createJevClient({ apiKey: "fixture-key", fetch, ...options });
async function collect<T>(source: AsyncIterable<T>): Promise<T[]> {
  const values: T[] = [];
  for await (const value of source) values.push(value);
  return values;
}
const failure = (result: DecisionResult, code: string, attempts?: number) => {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
  if (attempts !== undefined) assert.equal(result.attempts, attempts);
};
const code =
  (expected: string) =>
  (cause: unknown): boolean =>
    cause instanceof JevError && cause.detail.code === expected;

test("request validation snapshots all three question types and structured guidance", () => {
  const clone = structuredClone(request);
  assert.deepEqual(validateRequest(clone), request);
  assert.notEqual(validateRequest(clone).questions, clone.questions);
  assert.deepEqual(parseInput(JSON.stringify(request)), request);
  for (const state of ["", [], {}]) {
    const custom = {
      id: "ok",
      state,
      questions: { check: { type: "noul", instructions: ["Evaluate this."] } },
    };
    assert.deepEqual(validateRequest(custom), custom);
  }
  validateRequest({
    id: "structured",
    state: "state",
    questions: {
      pick: {
        type: "choice",
        instructions: { task: "Choose" },
        criteria: { a: null, b: ["guidance"], c: { meaning: "other" } },
      },
      score: { type: "score", instructions: "Score", criteria: ["only level"] },
    },
  });
});

test("invalid or unbounded input is rejected before API access without reflecting state", async () => {
  const circular: Record<string, unknown> = {};
  circular.self = circular;
  let deep: unknown = "leaf";
  for (let i = 0; i < 66; i++) deep = [deep];
  const bad = [
    null,
    [],
    {},
    { ...request, id: "secret\ntext" },
    { ...request, state: null },
    { ...request, extra: true },
    { ...request, questions: {} },
    { ...request, state: NaN },
    { ...request, state: new Date() },
    { ...request, state: circular },
    { ...request, state: deep },
    { ...request, state: [undefined] },
    { ...request, state: new Array(2) },
    { ...request, state: "x".repeat(LIMITS.inputBytes) },
    {
      ...request,
      questions: Object.fromEntries(
        Array.from({ length: 65 }, (_, i) => [
          String(i),
          { type: "noul", instructions: "Test" },
        ]),
      ),
    },
  ];
  for (const question of [
    null,
    { type: "other", instructions: "yes" },
    { type: "noul", instructions: " " },
    { type: "noul", instructions: {} },
    { type: "noul", instructions: "q", extra: true },
    { type: "noul", instructions: "q", criteria: { true: "yes" } },
    {
      type: "noul",
      instructions: "q",
      criteria: { true: "yes", false: "no", extra: "no" },
    },
    { type: "choice", instructions: "q", criteria: {} },
    { type: "choice", instructions: "q", criteria: { bad: 4 } },
    { type: "choice", instructions: "q", criteria: { "bad id": "value" } },
    {
      type: "choice",
      instructions: "q",
      criteria: Object.fromEntries(
        Array.from({ length: 256 }, (_, i) => [String(i), "v"]),
      ),
    },
    { type: "score", instructions: "q", criteria: [] },
    { type: "score", instructions: "q", criteria: [null] },
  ])
    bad.push({ ...request, questions: { bad: question } });
  const guarded = client(
    transport(() => {
      assert.fail("Invalid input reached transport");
    }),
  );
  for (const input of bad)
    failure(await guarded.decide(input), "INVALID_INPUT", 0);
  assert.throws(() => parseInput("not json"), code("INVALID_INPUT"));
  assert.throws(
    () => parseInput("x".repeat(LIMITS.inputBytes + 1)),
    code("INVALID_INPUT"),
  );
});

test("transport sends only provider wire fields to the pinned endpoint and preserves optional metadata", async () => {
  const result = await client(
    transport((url, init) => {
      assert.equal(url, JEV_ENDPOINT);
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(
        new Headers(init?.headers).get("authorization"),
        "Bearer fixture-key",
      );
      assert.deepEqual(JSON.parse(init?.body as string), {
        model: JEV_MODEL,
        state: request.state,
        questions: request.questions,
      });
      return Response.json({ ...response, ignored: "private extra" });
    }),
  ).decide(request);
  assert.deepEqual(result, {
    schemaVersion: 1,
    requestId: request.id,
    attempts: 1,
    ok: true,
    response,
  });
  const minimal = {
    model: JEV_MODEL,
    answers: {
      team: { type: "choice", choice: "frontend" },
      urgency: { type: "score", score: 0 },
      is_bug: { type: "noul", noul: 0 },
    },
    usage: { input_tokens: 0, output_tokens: 0 },
  };
  assert.deepEqual(validateResponse(minimal, request), minimal);
  const partial = structuredClone(response);
  partial.answers.team.probabilities = {
    payments: 0.84,
  } as typeof partial.answers.team.probabilities;
  assert.deepEqual(validateResponse(partial, request), partial);
});

test("OpenRouter's resolved Jev revision is accepted and preserved while requests use the alias", async () => {
  // Revision observed in a real OpenRouter response on 2026-10-01.
  const resolved = { ...response, model: "typesafe/jev-1.13-20260917" };
  const result = await client(
    transport((_url, init) => {
      assert.equal(JSON.parse(init?.body as string).model, "typesafe/jev-1.13");
      return Response.json(resolved);
    }),
  ).decide(request);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.response, resolved);
});

test("malformed, partial, wrong-model and out-of-range provider responses fail closed", async () => {
  const bad: unknown[] = [
    null,
    [],
    {},
    { ...response, model: "another-model" },
    { ...response, model: "typesafe/jev-1.13-20990101" },
    { ...response, model: "typesafe/jev-1.13-20260917-extra" },
    { ...response, model: "typesafe/jev-1.14-20260917" },
    { ...response, usage: {} },
    { ...response, usage: { input_tokens: -1, output_tokens: 1 } },
    { ...response, usage: { input_tokens: 1, output_tokens: 1.5 } },
    { ...response, usage: { ...response.usage, cost: -1 } },
    { ...response, id: "" },
    { ...response, provider: 2 },
    { ...response, answers: {} },
    { ...response, answers: { ...response.answers, extra: {} } },
  ];
  for (const answer of [
    null,
    { type: "noul", noul: 0.5 },
    { type: "choice", choice: "unknown" },
    { type: "choice", choice: "payments", confidence: 1.01 },
    { type: "choice", choice: "payments", probabilities: { extra: 1 } },
    { type: "choice", choice: "payments", probabilities: { payments: -0.1 } },
    { type: "choice", choice: "payments", probabilities: [] },
  ])
    bad.push({ ...response, answers: { ...response.answers, team: answer } });
  for (const answer of [
    { type: "score", score: 3 },
    { type: "score", score: "1" },
    { type: "score", score: 1, legend: { "3": "invalid" } },
    { type: "score", score: 1, legend: { "0": null } },
  ])
    bad.push({
      ...response,
      answers: { ...response.answers, urgency: answer },
    });
  bad.push({
    ...response,
    answers: { ...response.answers, is_bug: { type: "noul", noul: 1.1 } },
  });
  for (const payload of bad)
    failure(
      await client(transport(() => Response.json(payload))).decide(request),
      "INVALID_RESPONSE",
      1,
    );
  failure(
    await client(transport(() => new Response("private non-JSON body"))).decide(
      request,
    ),
    "INVALID_RESPONSE",
  );
  failure(
    await client(transport(() => new Response(null))).decide(request),
    "INVALID_RESPONSE",
  );
  failure(
    await client(transport(() => new Response(new Uint8Array([0xff])))).decide(
      request,
    ),
    "INVALID_RESPONSE",
  );
});

test("response byte limits cover headers and chunked bodies", async () => {
  failure(
    await client(
      transport(
        () =>
          new Response("", {
            headers: { "content-length": String(LIMITS.responseBytes + 1) },
          }),
      ),
    ).decide(request),
    "RESPONSE_TOO_LARGE",
  );
  failure(
    await client(
      transport(() => new Response("x".repeat(LIMITS.responseBytes + 1))),
    ).decide(request),
    "RESPONSE_TOO_LARGE",
  );
  const bytes = new TextEncoder().encode(JSON.stringify(response));
  const stream = new ReadableStream({
    start(c) {
      c.enqueue(bytes.slice(0, 20));
      c.enqueue(bytes.slice(20));
      c.close();
    },
  });
  assert.equal(
    (await client(transport(() => new Response(stream))).decide(request)).ok,
    true,
  );
});

test("credentials and configuration are checked without leaking secret values", () => {
  for (const key of ["", " "])
    assert.throws(
      () => createJevClient({ apiKey: key }),
      code("MISSING_CREDENTIALS"),
    );
  assert.throws(
    () => createJevClient({ apiKey: "secret\nvalue" }),
    code("INVALID_CONFIG"),
  );
  for (const options of [
    { timeoutMs: 0 },
    { timeoutMs: 300001 },
    { maxRetries: -1 },
    { maxRetries: 6 },
    { maxRetries: 1.5 },
    { maxRetryDelayMs: -1 },
    { maxRetryDelayMs: 60001 },
  ])
    assert.throws(() => client(goodFetch, options), code("INVALID_CONFIG"));
  assert.ok(createJevClient({ apiKey: "fixture" }));
});

test("HTTP failures are sanitized; only transient statuses retry within configured limits", async () => {
  for (const status of [
    400, 401, 402, 403, 404, 413, 429, 500, 502, 503, 504, 524, 529,
  ]) {
    let count = 0;
    const result = await client(
      transport(() => {
        count++;
        return new Response("fixture-key PRIVATE STATE", {
          status,
          headers: { "retry-after": "0" },
        });
      }),
    ).decide(request);
    failure(
      result,
      status === 401
        ? "AUTHENTICATION"
        : status === 402
          ? "INSUFFICIENT_CREDITS"
          : "HTTP_ERROR",
    );
    assert.equal(count, status >= 429 ? 3 : 1);
    assert.doesNotMatch(JSON.stringify(result), /fixture-key|PRIVATE STATE/);
  }
  let count = 0;
  const recovered = await client(
    transport(() =>
      ++count === 1
        ? new Response(null, { status: 429, headers: { "retry-after": "0" } })
        : Response.json(response),
    ),
  ).decide(request);
  assert.equal(recovered.ok, true);
  assert.equal(recovered.attempts, 2);
  failure(
    await client(
      transport(
        () =>
          new Response(null, {
            status: 503,
            headers: { "retry-after": "999" },
          }),
      ),
    ).decide(request),
    "HTTP_ERROR",
    1,
  );
  failure(
    await client(
      transport(() => new Response(null, { status: 503 })),
      { maxRetries: 0 },
    ).decide(request),
    "HTTP_ERROR",
    1,
  );
});

test("Retry-After accepts seconds and dates and uses bounded exponential fallback", () => {
  assert.equal(retryDelay("0.01", 1), 10);
  assert.equal(
    retryDelay(
      "Thu, 01 Oct 2026 12:00:02 GMT",
      1,
      Date.parse("2026-10-01T12:00:00Z"),
    ),
    2000,
  );
  assert.equal(
    retryDelay(
      "Thu, 01 Oct 2026 11:59:00 GMT",
      1,
      Date.parse("2026-10-01T12:00:00Z"),
    ),
    0,
  );
  assert.ok(retryDelay("invalid", 1) >= 500);
  assert.ok(retryDelay(null, 10) < 10250);
});

test("ambiguous transport failures are not replayed by default; explicit replay is bounded", async () => {
  const broken = transport(() => {
    throw new Error("fixture-key PRIVATE STATE");
  });
  const result = await client(broken).decide(request);
  failure(result, "TRANSPORT_ERROR", 1);
  assert.doesNotMatch(JSON.stringify(result), /fixture-key|PRIVATE STATE/);
  failure(
    await client(broken, { retryTransportErrors: true, maxRetries: 1 }).decide(
      request,
    ),
    "TRANSPORT_ERROR",
    2,
  );
});

test("deadlines and cancellation abort active fetch, body reads, and retry waits", async () => {
  const before = new AbortController();
  before.abort("PRIVATE STATE");
  failure(
    await client(
      transport(() => assert.fail("Pre-cancelled request sent")),
    ).decide(request, { signal: before.signal }),
    "CANCELLED",
    0,
  );
  let transportSignal: AbortSignal | undefined;
  const hanging = client(
    transport((_, init) => {
      transportSignal = init?.signal ?? undefined;
      return new Promise(() => {});
    }),
    { timeoutMs: 20 },
  );
  failure(await hanging.decide(request), "TIMEOUT", 1);
  assert.equal(transportSignal?.aborted, true);
  const controller = new AbortController();
  const pending = client(transport(() => new Promise(() => {}))).decide(
    request,
    { signal: controller.signal },
  );
  controller.abort("PRIVATE STATE");
  failure(await pending, "CANCELLED");
  const body = new ReadableStream<Uint8Array>({ start() {} });
  failure(
    await client(
      transport(() => new Response(body)),
      { timeoutMs: 20 },
    ).decide(request),
    "TIMEOUT",
  );
  failure(
    await client(
      transport(
        () =>
          new Response(null, { status: 429, headers: { "retry-after": "1" } }),
      ),
      { timeoutMs: 20 },
    ).decide(request),
    "TIMEOUT",
    1,
  );
  const already = new AbortController();
  already.abort();
  await assert.rejects(
    withSignal(Promise.resolve(1), already.signal),
    code("CANCELLED"),
  );
});

test("batch bounds concurrency and correlates out-of-order and invalid results", async () => {
  let active = 0;
  let peak = 0;
  const controlled = client(
    transport(async (_, init) => {
      active++;
      peak = Math.max(peak, active);
      const body = JSON.parse(init?.body as string) as { state: string };
      await new Promise((resolve) =>
        setTimeout(resolve, body.state === "slow" ? 30 : 1),
      );
      active--;
      return Response.json(response);
    }),
  );
  const inputs = [
    { ...request, id: "same-id", state: "slow" },
    { ...request, id: "same-id", state: "fast" },
    null,
    { ...request, id: "last" },
  ];
  const results = await collect(
    decideBatch(controlled, inputs, { concurrency: 2 }),
  );
  assert.equal(peak, 2);
  assert.equal(results.length, 4);
  assert.equal(results[0]?.sequence, 1);
  assert.deepEqual(results.map((r) => r.sequence).sort(), [0, 1, 2, 3]);
  failure(
    results.find((r) => r.sequence === 2)!,
    "INVALID_INPUT",
    0,
  );
  assert.equal(results.find((r) => r.sequence === 3)?.requestId, "last");
  await assert.rejects(
    collect(decideBatch(controlled, [], { concurrency: 0 })),
    code("INVALID_CONFIG"),
  );
});

test("batch drains admitted work on source error and caps total admissions", async () => {
  async function* failing() {
    yield request;
    throw new Error("private input location");
  }
  const results: DecisionResult[] = [];
  await assert.rejects(async () => {
    for await (const result of decideBatch(client(), failing()))
      results.push(result);
  }, code("IO_ERROR"));
  assert.equal(results.length, 1);
  assert.equal(results[0]?.ok, true);
  const oversized = Array.from(
    { length: LIMITS.batchRequests + 1 },
    () => null,
  );
  let count = 0;
  await assert.rejects(async () => {
    for await (const _result of decideBatch(client(), oversized)) count++;
  }, code("BATCH_LIMIT"));
  assert.equal(count, LIMITS.batchRequests);
});

test("batch cancellation stops admission and emits errors for active requests", async () => {
  const controller = new AbortController();
  let calls = 0;
  const hanging = client(
    transport(() => {
      if (++calls === 2) controller.abort();
      return new Promise(() => {});
    }),
  );
  const results = await collect(
    decideBatch(
      hanging,
      Array.from({ length: 8 }, () => request),
      { concurrency: 2, signal: controller.signal },
    ),
  );
  assert.equal(calls, 2);
  assert.equal(results.length, 2);
  for (const result of results) failure(result, "CANCELLED");
  assert.deepEqual(
    await collect(
      decideBatch(client(), [request], { signal: controller.signal }),
    ),
    [],
  );
});

test("batch yields completed results while waiting for slow input and closes on consumer return", async () => {
  let closeCalled = false;
  let readCount = 0;
  const source = {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<unknown>> {
          return readCount++ === 0
            ? { value: request, done: false }
            : new Promise(() => {});
        },
        async return(): Promise<IteratorResult<unknown>> {
          closeCalled = true;
          return { value: undefined, done: true };
        },
      };
    },
  };
  for await (const result of decideBatch(client(), source)) {
    assert.equal(result.ok, true);
    break;
  }
  assert.equal(closeCalled, true);
  const controller = new AbortController();
  const pending = collect(
    decideBatch(client(), source, { signal: controller.signal }),
  );
  controller.abort();
  assert.deepEqual(await pending, []);
});
