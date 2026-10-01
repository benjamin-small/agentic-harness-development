import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

// Use a verified installed package to test a published artifact instead of source.
const { values } = parseArgs({
  options: { "package-root": { type: "string" } },
});
const root = values["package-root"]
  ? resolve(values["package-root"])
  : fileURLToPath(new URL("../", import.meta.url));

if (process.env.JEV_LIVE_SMOKE !== "1") {
  console.error(
    "Set JEV_LIVE_SMOKE=1 to authorize up to two synthetic, potentially billable requests (library and CLI, no retries).",
  );
  process.exitCode = 2;
} else {
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  const report = {
    verified: false,
    timestamp: new Date().toISOString(),
    tests: [],
  };
  try {
    assert.ok(apiKey);
    const { createJevClient, JEV_MODEL, JEV_MODEL_REVISION, validateRequest } =
      await import(pathToFileURL(resolve(root, "dist/src/jev/index.js")).href);
    report.version = JSON.parse(
      readFileSync(resolve(root, "package.json")),
    ).version;
    report.requestedModel = JEV_MODEL;
    const request = validateRequest({
      id: "live-smoke-library",
      state: {
        synthetic: true,
        ticket:
          "The payment service is completely unavailable. Every checkout fails. This current outage blocks all customers from purchasing.",
      },
      questions: {
        team: {
          type: "choice",
          instructions: "Which team should own this ticket?",
          criteria: {
            account: "Login, permissions, or profile issues",
            frontend: "Visual styling and layout issues",
            payments: "Checkout and payment processing failures",
          },
        },
        urgency: {
          type: "score",
          instructions: "Rate the impact of this current outage.",
          criteria: [
            "Minor cosmetic issue; no customer workflow blocked",
            "Degraded experience; purchases can still complete",
            "Complete outage; all purchases are blocked",
          ],
        },
        is_bug: {
          type: "noul",
          instructions: "Does the ticket describe broken product behavior?",
          criteria: {
            true: "Existing functionality is failing",
            false: "A request for a new feature, with no existing failure",
          },
        },
      },
    });
    const accept = (channel, result, expectedId) => {
      report.tests.push({ channel, ...result });
      assert.equal(result.ok, true);
      assert.equal(result.schemaVersion, 1);
      assert.equal(result.requestId, expectedId);
      assert.equal(result.attempts, 1);
      assert.ok(
        [JEV_MODEL, JEV_MODEL_REVISION].includes(result.response.model),
      );
      assert.deepEqual(Object.keys(result.response.answers).sort(), [
        "is_bug",
        "team",
        "urgency",
      ]);
      const { team, urgency, is_bug: isBug } = result.response.answers;
      assert.equal(team.type, "choice");
      assert.equal(urgency.type, "score");
      assert.equal(isBug.type, "noul");
      // Illustrative consumer decisions for this fixture, not calibrated thresholds.
      const consumed = {
        route: team.choice,
        urgent: urgency.score >= 1.5,
        bug: isBug.noul >= 0.5,
      };
      assert.deepEqual(consumed, {
        route: "payments",
        urgent: true,
        bug: true,
      });
      report.tests.at(-1).consumed = consumed;
    };
    const client = createJevClient({
      apiKey,
      maxRetries: 0,
      timeoutMs: 20_000,
    });
    accept("library", await client.decide(request), request.id);

    const cliRequest = { ...request, id: "live-smoke-cli" };
    const cli = spawnSync(
      process.execPath,
      [
        resolve(root, "dist/src/jev/cli.js"),
        "decide",
        "--input",
        "-",
        "--max-retries",
        "0",
        "--timeout-ms",
        "20000",
      ],
      {
        input: JSON.stringify(cliRequest),
        encoding: "utf8",
        timeout: 25_000,
        maxBuffer: 1_048_576,
        env: { OPENROUTER_API_KEY: apiKey },
      },
    );
    assert.ifError(cli.error);
    // Runtime envelopes contain sanitized errors; never print raw child diagnostics.
    const result = JSON.parse(cli.stdout);
    accept("cli", result, cliRequest.id);
    assert.equal(cli.status, 0);
    assert.equal(cli.stderr, "");
    report.verified = true;
  } catch {
    report.failure =
      "Live setup, transport, response, or fixture expectation failed. No raw diagnostics are retained.";
    process.exitCode = 1;
  }
  const output = JSON.stringify(report);
  console.log(apiKey ? output.replaceAll(apiKey, "[REDACTED]") : output);
}
