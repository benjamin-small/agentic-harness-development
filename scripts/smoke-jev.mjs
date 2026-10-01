import assert from "node:assert/strict";
import { createJevClient, JEV_MODEL } from "../dist/src/jev/index.js";

if (process.env.JEV_LIVE_SMOKE !== "1") {
  console.error(
    "Set JEV_LIVE_SMOKE=1 to authorize one synthetic, potentially billable request.",
  );
  process.exitCode = 2;
} else {
  try {
    const client = createJevClient({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      maxRetries: 0,
      timeoutMs: 20_000,
    });
    const result = await client.decide({
      id: "live-smoke",
      state: "The color is blue.",
      questions: {
        is_blue: {
          type: "noul",
          instructions: "Does the state explicitly say the color is blue?",
          criteria: {
            true: "The color is blue",
            false: "The color is not blue",
          },
        },
      },
    });
    if (!result.ok) {
      console.error(
        JSON.stringify({
          verified: false,
          attempts: result.attempts,
          error: result.error,
        }),
      );
      process.exitCode = 1;
    } else {
      assert.equal(result.response.model, JEV_MODEL);
      console.log(
        JSON.stringify({
          verified: true,
          model: result.response.model,
          attempts: result.attempts,
          usage: result.response.usage,
        }),
      );
    }
  } catch {
    console.error(
      "Live smoke setup or verification failed. Check credentials and rebuild; no secrets are logged.",
    );
    process.exitCode = 2;
  }
}
