import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/** Verify the exact installed CLI/library; provider traffic is mocked. */
export async function verifyJevRecipes(packageRoot, workingDirectory) {
  const lib = await import(
    pathToFileURL(join(packageRoot, "dist/src/jev/index.js"))
  );
  const input = {
    id: "consumer",
    findings: [
      { id: "f", claim: "Returns 1", evidence: "function f(){return 1;}" },
    ],
  };
  const fixture = `globalThis.fetch=async(_url,init)=>{const b=JSON.parse(init.body);return Response.json({model:'typesafe/jev-1.13',answers:Object.fromEntries(Object.keys(b.questions).map(id=>[id,{type:'choice',choice:'supported'}])),usage:{input_tokens:1,output_tokens:1}})};`;
  const log = join(workingDirectory, "jev-recipe-calls.jsonl");
  const client = lib.createJevClient({
    apiKey: "fixture-only",
    logPath: log,
    fetch: async () =>
      Response.json({
        model: lib.JEV_MODEL,
        answers: { f: { type: "choice", choice: "supported" } },
        usage: { input_tokens: 1, output_tokens: 1 },
      }),
  });
  const result = await lib.runRecipe(client, lib.findingSupport(input));
  assert.equal(result.ok, true);
  assert.equal(result.response.answers.f.choice, "supported");
  await lib.recordJevOutcome(
    { callId: result.callId, outcome: "used", reason: "accepted" },
    log,
  );
  const preload = join(workingDirectory, "jev-provider-fixture.mjs");
  const request = join(workingDirectory, "jev-findings.json");
  await writeFile(preload, fixture);
  await writeFile(request, JSON.stringify(input));
  const env = {
    ...process.env,
    OPENROUTER_API_KEY: "fixture-only",
    JEV_LOG_PATH: log,
  };
  delete env.NODE_OPTIONS;
  delete env.NODE_PATH;
  const cli = join(packageRoot, "dist/src/jev/cli.js");
  const output = JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", preload, cli, "finding-support", "--input", request],
      { env, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ),
  );
  assert.equal(output.ok, true);
  assert.equal(output.response.answers.f.choice, "supported");
  const outcome = join(workingDirectory, "jev-outcome.json");
  await writeFile(
    outcome,
    JSON.stringify({
      callId: output.callId,
      outcome: "used",
      reason: "accepted",
    }),
  );
  execFileSync(process.execPath, [cli, "outcome", "--input", outcome], {
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const events = (await readFile(log, "utf8"))
    .trim()
    .split("\n")
    .map((line) => JSON.parse(line));
  assert.ok(
    events.some((e) => e.callId === result.callId && e.outcome === "used"),
  );
  assert.ok(
    events.some((e) => e.callId === output.callId && e.outcome === "used"),
  );
  assert.ok(!JSON.stringify(events).includes("Returns 1"));
  return {
    library: true,
    cli: true,
    correlatedOutcome: true,
    liveProvider: false,
  };
}
