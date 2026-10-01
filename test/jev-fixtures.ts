import { JEV_MODEL, type DecisionRequest } from "../src/jev/index.js";

export const request: DecisionRequest = {
  id: "ticket-42",
  state: { ticket: "Checkout fails with a server error." },
  questions: {
    team: {
      type: "choice",
      instructions: "Choose the responsible team.",
      criteria: {
        frontend: "Browser rendering",
        payments: "Checkout failures",
      },
    },
    urgency: {
      type: "score",
      instructions: "Rate urgency.",
      criteria: ["Can wait", "Degraded", "Blocking"],
    },
    is_bug: {
      type: "noul",
      instructions: "Is this a bug?",
      criteria: { true: "Unexpected failure", false: "Feature request" },
    },
  },
};
export const response = {
  model: JEV_MODEL,
  answers: {
    team: {
      type: "choice",
      choice: "payments",
      confidence: 0.75,
      probabilities: { frontend: 0.16, payments: 0.84 },
    },
    urgency: {
      type: "score",
      score: 1.99,
      confidence: 0.99,
      probabilities: { "0": 0, "1": 0.01, "2": 0.99 },
      legend: { "0": "Can wait", "1": "Degraded", "2": "Blocking" },
    },
    is_bug: { type: "noul", noul: 0.96 },
  },
  usage: { input_tokens: 32, output_tokens: 3, cost: 0.0001 },
  id: "gen-fixture",
  provider: "TypeSafe",
};
export const transport = (
  callback: (
    url: Parameters<typeof fetch>[0],
    init?: RequestInit,
  ) => Response | Promise<Response>,
): typeof fetch => (async (url, init) => callback(url, init)) as typeof fetch;
export const goodFetch = transport(() => Response.json(response));
