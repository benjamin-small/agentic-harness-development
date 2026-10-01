# Jev library and CLI

Introduced in **0.1.0-alpha.2** and included in subsequent timestamp releases. The package exports `@benjamin-small/agentic-harness-development/jev` and a `jev` executable. Node.js 24 or 26 is required. Installing or selecting instructions never calls the API. Invoking `decide` or `batch` sends supplied state to OpenRouter and can incur charges.

The transport is pinned to `POST https://openrouter.ai/api/alpha/decisions` and `typesafe/jev-1.13`. It does not use chat completions or the separate TypeSafe SDK endpoint. The alpha [upstream schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request) was checked on 2026-10-01. Fixtures test that contract; they do not establish live provider availability or model quality.

## Commands

```sh
jev validate --input request.json
jev decide --input request.json
jev decide --input -
jev batch --input requests.jsonl --concurrency 4
jev --version
```

From source, run `npm ci && npm run build`, then replace `jev` with `node dist/src/jev/cli.js`. From a release, use its `node_modules/.bin/jev`. Do not run an unpinned `npx jev` from a different package.

`validate` needs no credentials or network. `decide` and `batch` read `OPENROUTER_API_KEY` from the environment. There is no key argument or automatic `.env` loading. Inject secrets through the host environment or deployment secret system. Library users pass `apiKey` explicitly. Diagnostics omit keys, headers, provider error bodies, and input state.

## Input

One JSON request has an `id`, shared `state`, and named `questions`:

```json
{
  "id": "ticket-42",
  "state": { "ticket": "Checkout fails with a server error." },
  "questions": {
    "team": {
      "type": "choice",
      "instructions": "Choose the responsible team.",
      "criteria": {
        "frontend": "Browser rendering",
        "payments": "Checkout failures"
      }
    },
    "urgency": {
      "type": "score",
      "instructions": "Rate the impact of the reported failure.",
      "criteria": ["Can wait", "Degraded feature", "Blocking issue"]
    },
    "is_bug": {
      "type": "noul",
      "instructions": "Is this an unexpected failure?",
      "criteria": { "true": "Unexpected failure", "false": "Feature request" }
    }
  }
}
```

`state` accepts a string, object, or array of JSON data. Instructions and criterion descriptions accept nonempty strings, objects, or arrays. Choice descriptions may also be `null`. Noul criteria are optional; when supplied, both true and false are required. Scores accept 1–255 ordered criteria; prefer 2–10 descriptive levels. The score is a weighted **zero-based position**, from 0 to the number of levels minus one.

The toolkit permits 64 questions and 255 criteria per choice/score question. Request IDs, question IDs, and choice keys must match `[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}`. IDs correlate results; put meaning inside instructions and criteria. Unknown request/question fields, non-JSON values, cyclic objects, and excessive depth are rejected. Valid inputs are snapshotted before transport so caller mutations cannot change retries. These are toolkit constraints; the provider schema can be broader.

Multiple questions are independent. Ask dependent questions in separate calls with the earlier answer as state. Read [the skill knowledge index](../skills/jev/knowledge/INDEX.md) for design and interpretation.

## Library

```ts
import {
  createJevClient,
  decideBatch,
  validateRequest,
} from "@benjamin-small/agentic-harness-development/jev";

const client = createJevClient({
  apiKey: process.env.OPENROUTER_API_KEY ?? "",
  timeoutMs: 30_000,
  maxRetries: 2,
});
const input = validateRequest(JSON.parse(requestText));
const result = await client.decide(input, { signal: abortController.signal });
if (result.ok) {
  consume(result.response.answers, result.response.usage);
} else {
  handleFailure(result.error.code, result.requestId);
}

for await (const result of decideBatch(client, requests, { concurrency: 4 })) {
  consumeCorrelatedResult(result.sequence, result.requestId, result);
}
```

`requestText`, `abortController`, `requests`, and consumer functions above are application-provided. `decideBatch` accepts synchronous or asynchronous iterables. Pi can register a tool backed by these exports; a native extension is a separate milestone.

`createJevClient` accepts injected `fetch` for tests or host transport and throws `JevError` for invalid setup. `validateRequest` and `parseInput` also throw structured errors. `decide` resolves success/error envelopes for ordinary JSON input and runtime failures. The endpoint/model are fixed in this version. Injected transports must respect cancellation and must not forward credentials to another origin. Native fetch rejects redirects.

## Output and batches

Each admitted request yields `{schemaVersion: 1, requestId, attempts, ok, response}` on success, or `{schemaVersion: 1, requestId, attempts, ok: false, error}` on failure. `attempts` counts transport attempts; validation failures have zero. Invalid request IDs return as `null`.

A successful `response` has `model`, `answers`, and `usage`. Requests use the `JEV_MODEL` alias `typesafe/jev-1.13`; responses may identify that alias or the documented `JEV_MODEL_REVISION`, `typesafe/jev-1.13-20260917`. Preserve the returned model ID. Other models and unknown revisions are rejected; matching arbitrary prefixes is not sufficient. Answers contain exactly the requested IDs and matching types: choice answers carry `choice`, score answers carry `score`, and noul answers carry `noul` (0–1). Usage requires `input_tokens` and `output_tokens`. The client validates types, ranges, choices, model, completeness, and usage. Optional confidence, probabilities, score legends, cost, provider, and provider request ID are preserved when present; absent metadata remains absent and unknown fields are dropped. Partial probability maps are preserved without filling missing values or renormalizing. Confidence is concentration, not empirical correctness.

Errors have `{code, message, retryable, status?}`. Codes include `INVALID_INPUT`, `AUTHENTICATION`, `INSUFFICIENT_CREDITS`, `HTTP_ERROR`, `TRANSPORT_ERROR`, `INVALID_RESPONSE`, `RESPONSE_TOO_LARGE`, `TIMEOUT`, and `CANCELLED`.

Each nonblank JSONL line is one request. Malformed/oversized lines yield an `INVALID_INPUT` result and processing continues; blank lines are skipped. Results stream in **completion order**, with zero-based `sequence` identifying the nonblank input position. IDs may repeat; use `sequence` to distinguish them. No unbounded reorder buffer is retained. Output backpressure bounds further scheduling.

Cancellation stops admission and aborts active requests, which yield cancellation results. Inputs not yet admitted receive no result. Breaking library iteration aborts outstanding work. Input-source failures drain admitted work, then raise `IO_ERROR`. Batches exceeding 10,000 nonblank inputs drain admitted work, then raise `BATCH_LIMIT`; the extra input used to detect this limit is not admitted. Split larger jobs. Async producers should implement `return()` and cancellation for their resources.

Stdout contains JSON for `decide`, JSONL for `batch`, or a small local-validation result for `validate`. Setup, file/stream errors, and batch-level failures go to stderr as JSON; provider failures remain in result envelopes. `--help`/`--version` print text. Exit codes: 0 success (including an empty batch), 1 any decision/batch/IO failure, 2 usage/setup/validation failure, 130 SIGINT, 143 SIGTERM. A partial batch can have valid stdout results and a nonzero exit.

## Bounds, retries, and billing

| Limit                                                  | Default / maximum                   |
| ------------------------------------------------------ | ----------------------------------- |
| Serialized request or JSONL line                       | 1 MiB                               |
| Provider response                                      | 4 MiB                               |
| JSON nesting                                           | 64 levels                           |
| Batch concurrency                                      | 4 / 16                              |
| Batch admissions                                       | 10,000                              |
| Per-request deadline, including retries and body reads | 30 seconds / 300 seconds            |
| Additional attempts                                    | 2 / 5                               |
| Permitted retry delay                                  | 10 seconds / 60 seconds via library |

`--timeout-ms` and `--max-retries` set deadline and retries. HTTP 408, 429, 500, 502, 503, 504, 524, and 529 may retry; authentication, billing, validation, and malformed successful responses do not. Retry-After seconds/HTTP dates take precedence over exponential backoff with jitter. If a requested delay exceeds `maxRetryDelayMs`, the error returns without retrying early. `retryable` describes the error class even when the current budget is exhausted.

Ambiguous transport errors are **not retried by default** because the provider may have billed them. `--retry-transport-errors` / `retryTransportErrors: true` permits replay. HTTP retries and local timeouts cannot guarantee exactly-once billing either. Cancellation cannot undo remote work; use `--max-retries 0` for a one-attempt budget. Concurrency controls simultaneous requests, not monetary spend. There is no global rate limiter or account budget enforcement.

## Validation status

Contract, fault, CLI, and package tests use synthetic fixtures and injected transport. A [live library and CLI check](verification/jev-2026-10-01.md) passed on 2026-10-01 after correcting resolved-model validation. Earlier releases through v2026.1001.174037 reject the observed dated model ID; upgrade the runtime and project pin together.

For an explicitly authorized live check, inject only `OPENROUTER_API_KEY` and run `JEV_LIVE_SMOKE=1 npm run jev:smoke`. It makes up to two requests (library then CLI), each with choice, score, and noul questions, no retries, and a 20-second deadline. It emits correlated answers, model, usage, and illustrative consumer decisions; it does not print credentials or provider error bodies. The CLI child receives only the API key. If the library check fails, the CLI call is skipped.

To test an already verified release instead of this checkout, run `JEV_LIVE_SMOKE=1 node scripts/smoke-jev.mjs --package-root /absolute/runtime/node_modules/@benjamin-small/agentic-harness-development`. The runner lives in the source checkout. Never put the key in command arguments, commit it, or paste it into chat. Fixture success proves bounded integration behavior, not general accuracy or permission to process private project data.
