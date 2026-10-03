import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

// Native model evaluation is opt-in. MCP transport is a synthetic local fixture.
// User prompts never name Jev; normal default-use guidance is ambient policy.
if (process.env.JEV_ADOPTION_EVAL !== "1")
  throw new Error(
    "Set JEV_ADOPTION_EVAL=1 to authorize fresh Codex model runs (no live Jev calls).",
  );
const repo = fileURLToPath(new URL("../", import.meta.url));
const output = process.argv[2]
  ? resolve(process.argv[2])
  : await mkdtemp(join(tmpdir(), "jev-adoption-"));
await mkdir(output, { recursive: true, mode: 0o700 });
const cases = JSON.parse(
  await readFile(join(repo, "tests/dogfood/jev-adoption-cases.json"), "utf8"),
);
const skill = await readFile(join(repo, "skills/jev/SKILL.md"), "utf8");
const defaults = await readFile(
  join(repo, "skills/jev/knowledge/default-use.md"),
  "utf8",
);
const instructions = `You are evaluating ordinary tasks with the available tools. The user authorizes the supplied synthetic data for structured decisions. All tool inference in this evaluation uses a local mock; no OpenRouter request is possible. Apply the following installed skill and default-use policy. Skip installation and startup maintenance in this isolated evaluation. Do not inspect files outside the task directory.\n${skill}\n${defaults}`;
const summaries = [];
for (const item of cases) {
  const dir = join(output, item.id);
  await mkdir(dir, { mode: 0o700 });
  const log = join(dir, "calls.jsonl");
  const server = {
    command: process.execPath,
    args: [
      "--import",
      join(repo, "tests/dogfood/jev-mock-transport.mjs"),
      join(repo, "dist/src/jev/mcp-cli.js"),
    ],
    env: {
      OPENROUTER_API_KEY: "synthetic-fixture-only",
      JEV_LOG_PATH: log,
      JEV_ALLOWED_DATA_SCOPES: "synthetic",
    },
  };
  const override = `mcp_servers.jev={command=${JSON.stringify(server.command)},args=${JSON.stringify(server.args)},env={${Object.entries(
    server.env,
  )
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
    .join(",")}}}`;
  const args = [
    "exec",
    "--ignore-user-config",
    "--ephemeral",
    "--skip-git-repo-check",
    "--approve-for-me",
    "--cd",
    dir,
    "--json",
    "--config",
    "project_doc_max_bytes=0",
    "--config",
    `developer_instructions=${JSON.stringify(instructions)}`,
    "--config",
    override,
    "--output-last-message",
    join(dir, "answer.txt"),
    item.prompt,
  ];
  let stdout = "",
    stderr = "";
  const started = performance.now();
  const child = spawn(process.env.CODEX_BIN ?? "codex", args, {
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (data) => {
    stdout += data;
  });
  child.stderr.on("data", (data) => {
    stderr += data;
  });
  const timer = setTimeout(() => child.kill("SIGTERM"), 180_000);
  const code = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", resolve);
  }).finally(() => clearTimeout(timer));
  await writeFile(join(dir, "trace.jsonl"), stdout, { mode: 0o600 });
  await writeFile(join(dir, "diagnostics.txt"), stderr, { mode: 0o600 });
  let events = [];
  try {
    events = (await readFile(log, "utf8"))
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (cause) {
    if (cause.code !== "ENOENT") throw cause;
  }
  const starts = events.filter((e) => e.event === "jev.call.start");
  const successes = events.filter(
    (e) => e.event === "jev.call.finish" && e.status === "success",
  );
  const outcomes = events.filter(
    (e) => e.event === "jev.outcome" && e.outcome === "used",
  );
  const expectedRecipe = item.expectedTool?.replace("jev_", "");
  const trace = stdout
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const selectedTools = trace
    .filter(
      (e) => e.type === "item.started" && e.item?.type === "mcp_tool_call",
    )
    .map((e) => e.item.tool);
  const blockedTools = trace
    .filter(
      (e) =>
        e.type === "item.completed" &&
        e.item?.type === "mcp_tool_call" &&
        e.item?.error,
    )
    .map((e) => e.item.tool);
  const passed =
    code === 0 &&
    (expectedRecipe
      ? starts.some((e) => e.recipe === expectedRecipe) &&
        successes.length > 0 &&
        outcomes.some((e) => successes.some((s) => s.callId === e.callId))
      : starts.length === 0);
  summaries.push({
    id: item.id,
    passed,
    processExit: code,
    expectedTool: item.expectedTool,
    selectedTools,
    blockedTools,
    calls: starts.length,
    successfulCalls: successes.length,
    usedOutcomes: outcomes.length,
    elapsedMs: Math.round(performance.now() - started),
  });
  console.log(JSON.stringify(summaries.at(-1)));
}
const result = {
  mode: "native-codex-mocked-jev",
  providerQualityVerified: false,
  cases: summaries,
  passed: summaries.every((s) => s.passed),
};
await writeFile(
  join(output, "summary.json"),
  `${JSON.stringify(result, null, 2)}\n`,
  { mode: 0o600 },
);
console.log(JSON.stringify({ output, passed: result.passed }));
process.exitCode = result.passed ? 0 : 1;
