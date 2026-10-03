import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/** Verify the exact installed consumer artifact; all provider traffic is mocked. */
export async function verifyJevAdapter(packageRoot, workingDirectory) {
  const preload = join(workingDirectory, "jev-provider-fixture.mjs");
  const log = join(workingDirectory, "jev-adapter-calls.jsonl");
  await writeFile(
    preload,
    `globalThis.fetch=async(_url,init)=>{const b=JSON.parse(init.body);return Response.json({model:'typesafe/jev-1.13',answers:Object.fromEntries(Object.keys(b.questions).map(id=>[id,{type:'choice',choice:'supported'}])),usage:{input_tokens:1,output_tokens:1}})};`,
  );
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ["--import", preload, join(packageRoot, "dist/src/jev/mcp-cli.js")],
    env: {
      PATH: process.env.PATH ?? "",
      OPENROUTER_API_KEY: "fixture-only",
      JEV_LOG_PATH: log,
      JEV_ALLOWED_DATA_SCOPES: "synthetic",
    },
    stderr: "pipe",
  });
  const client = new Client({ name: "artifact-verification", version: "1" });
  try {
    await client.connect(transport);
    assert.equal((await client.listTools()).tools.length, 6);
    const result = await client.callTool({
      name: "jev_finding_support",
      arguments: {
        dataScope: "synthetic",
        id: "consumer",
        findings: [
          { id: "f", claim: "Returns 1", evidence: "function f(){return 1;}" },
        ],
      },
    });
    assert.equal(result.isError, false);
    assert.equal(
      result.structuredContent.response.answers.f.choice,
      "supported",
    );
    const callId = result.structuredContent.callId;
    assert.equal(
      (
        await client.callTool({
          name: "jev_record_outcome",
          arguments: { callId, outcome: "used", reason: "accepted" },
        })
      ).isError,
      false,
    );
    const events = (await readFile(log, "utf8"))
      .trim()
      .split("\n")
      .map((line) => JSON.parse(line));
    assert.equal(events[0].recipe, "finding_support");
    assert.equal(events.at(-1).callId, callId);
    assert.equal(events.at(-1).outcome, "used");
    assert.ok(!JSON.stringify(events).includes("Returns 1"));
    return {
      discovery: true,
      recipe: true,
      correlatedOutcome: true,
      liveProvider: false,
    };
  } finally {
    await client.close();
  }
}
