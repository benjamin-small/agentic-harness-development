import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable, Writable } from "node:stream";
import {
  createJevClient,
  evidenceRelevance,
  findingSupport,
  runRecipe,
  recordJevOutcome,
  type CallMetadata,
} from "../src/jev/index.js";
import { runCommand } from "../src/jev/command.js";
import { JEV_MODEL } from "../src/jev/types.js";

const evidence = {
  id: "fixture",
  objective: "Find checkout requirements",
  items: [
    { id: "a", text: "Checkout accepts card payments." },
    { id: "b", text: "A meeting about plants." },
  ],
};
const findings = {
  id: "review",
  findings: [
    {
      id: "f",
      claim: "Function returns 4.",
      evidence: "function f() { return 4; }",
    },
  ],
};
const transport: typeof fetch = async (_url, init) => {
  const body = JSON.parse(init!.body as string);
  assert.deepEqual(Object.keys(body).sort(), ["model", "questions", "state"]);
  return Response.json({
    model: JEV_MODEL,
    usage: { input_tokens: 1, output_tokens: 1 },
    answers: Object.fromEntries(
      Object.entries(body.questions).map(([key, q]) => [
        key,
        {
          type: "choice",
          choice: Object.keys((q as { criteria: object }).criteria)[0],
        },
      ]),
    ),
  });
};
test("recipes bound independent evidence decisions and preserve uncertain/insufficient alternatives", () => {
  const e = evidenceRelevance(evidence);
  assert.equal(e.version, 1);
  assert.deepEqual(Object.keys(e.request.questions), ["a", "b"]);
  const q = e.request.questions.a!;
  assert.equal(q.type, "choice");
  if (q.type === "choice")
    assert.deepEqual(Object.keys(q.criteria), [
      "relevant",
      "irrelevant",
      "uncertain",
    ]);
  const f = findingSupport(findings).request.questions.f!;
  if (f.type === "choice")
    assert.deepEqual(Object.keys(f.criteria), [
      "supported",
      "contradicted",
      "insufficient",
    ]);
  for (const input of [
    null,
    {},
    { ...evidence, objective: "" },
    { ...evidence, items: [] },
    { ...evidence, items: [...evidence.items, evidence.items[0]] },
    { ...evidence, items: [{ id: "bad id", text: "a" }] },
    { ...evidence, items: [{ id: "a", text: "x".repeat(16_001) }] },
  ])
    assert.throws(() => evidenceRelevance(input as typeof evidence));
  assert.throws(() => findingSupport(null as unknown as typeof findings));
  assert.throws(() =>
    findingSupport({
      ...findings,
      findings: [{ id: "f", claim: "hi", evidence: "" }],
    }),
  );
});

test("recipe results correlate safe metadata and caller-reported outcomes without logging content", async () => {
  const root = await mkdtemp(join(tmpdir(), "jev-recipes-"));
  const logPath = join(root, "calls.jsonl");
  try {
    const client = createJevClient({
      apiKey: "fixture",
      logPath,
      fetch: transport,
    });
    const result = await runRecipe(client, evidenceRelevance(evidence));
    assert.equal(result.ok, true);
    assert.match(result.callId!, /^[0-9a-f-]{36}$/);
    await recordJevOutcome(
      { callId: result.callId!, outcome: "used", reason: "accepted" },
      logPath,
    );
    await recordJevOutcome(
      { outcome: "unavailable", reason: "permission" },
      logPath,
    );
    for (const invalid of [
      { outcome: "used", reason: "accepted" },
      { callId: "secret", outcome: "unavailable", reason: "permission" },
      { outcome: "unavailable", reason: "private text" },
    ])
      await assert.rejects(
        recordJevOutcome(
          invalid as Parameters<typeof recordJevOutcome>[0],
          logPath,
        ),
      );
    const invalid = await client.decide(evidenceRelevance(evidence).request, {
      metadata: { recipe: "secret" } as unknown as CallMetadata,
    });
    assert.equal(invalid.ok, false);
    assert.equal(invalid.attempts, 0);
    const raw = await readFile(logPath, "utf8");
    const events = raw
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.deepEqual(events[0].recipe, "evidence_relevance");
    assert.equal(events[0].recipeVersion, 1);
    assert.equal(events[0].callId, result.callId);
    assert.equal(
      events.find((e) => e.event === "jev.outcome").callId,
      result.callId,
    );
    assert.doesNotMatch(
      raw,
      /checkout|plants|secret|private text|accepted card/i,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("CLI recipes default to one attempt and outcome logging stays offline", async () => {
  const root = await mkdtemp(join(tmpdir(), "jev-cli-recipes-"));
  const previous = process.env.JEV_LOG_PATH;
  process.env.JEV_LOG_PATH = join(root, "calls.jsonl");
  try {
    const run = async (command: string, input: unknown, fetch = transport) => {
      let out = "";
      const sink = new Writable({
        write(chunk, _encoding, done) {
          out += String(chunk);
          done();
        },
      });
      const code = await runCommand([command, "--input", "-", "--quiet"], {
        stdin: Readable.from([JSON.stringify(input)]),
        stdout: sink,
        stderr: new Writable({
          write(_c, _e, done) {
            done();
          },
        }),
        apiKey: "fixture",
        fetch,
      });
      return { code, value: JSON.parse(out) };
    };
    const e = await run("evidence-relevance", evidence);
    assert.equal(e.code, 0);
    assert.equal(e.value.recipe, "evidence_relevance");
    const f = await run("finding-support", findings);
    assert.equal(f.value.recipe, "finding_support");
    let calls = 0;
    const failed = await run("evidence-relevance", evidence, async () => {
      calls++;
      return new Response("", { status: 503 });
    });
    assert.equal(failed.code, 1);
    assert.equal(calls, 1);
    const outcome = await run(
      "outcome",
      {
        callId: e.value.callId,
        outcome: "overridden",
        reason: "contrary_evidence",
      },
      async () => {
        assert.fail("outcome must be offline");
      },
    );
    assert.equal(outcome.value.recorded, true);
  } finally {
    if (previous === undefined) delete process.env.JEV_LOG_PATH;
    else process.env.JEV_LOG_PATH = previous;
    await rm(root, { recursive: true, force: true });
  }
});
