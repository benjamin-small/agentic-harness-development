# Jev runtime implementation contract

Status: planned, not shipped by the foundation release. This document specifies the first implementation milestone.

## Library and transport

Create a TypeScript library with injected fetch, AbortSignal support, and explicit client configuration. Use the OpenRouter Decisions endpoint `https://openrouter.ai/api/alpha/decisions`, initially with `typesafe/jev-1.13`. Keep provider wire data distinct from our stable input/result envelopes. Re-check the [upstream schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request) before implementation because this endpoint is alpha.

One request contains shared state and multiple named questions. Question IDs correlate results; meaningful task instructions belong inside the questions. Dependent judgments require separate calls. A batch is a stream of independent requests, potentially with different states.

## Proposed commands

These commands describe the intended interface and do not exist yet:

```text
jev decide --input request.json
jev decide --input -
jev batch --input requests.jsonl --concurrency 4
jev validate --input request.json
jev --version
```

Use JSON on stdout, diagnostics on stderr, explicit question/request IDs, and documented nonzero exits. A batch preserves one result or structured error per accepted request and returns failure if any request failed. Decide and batch both call the library. Do not embed provider logic in argument handling.

## Robustness requirements

- Validate choice/score/noul inputs before network access, including empty sets and invalid criteria.
- Validate scalar answers and preserve optional probabilities/confidence/usage metadata without inventing absent values.
- Bound request sizes, concurrency, output buffering, retries, and deadlines. Cancellation must stop scheduling new work and abort active requests.
- Retry transient statuses with backoff and Retry-After support. An ambiguous transport failure may have reached the paid endpoint; document the replay/billing tradeoff and make retries configurable.
- Avoid retrying authentication or invalid-input failures. Return useful sanitized diagnostics without request state, headers, or credentials by default.
- Read OPENROUTER_API_KEY from environment in the CLI; accept an explicit secret value in library configuration. No key command-line flag.
- Provide fixtures for malformed/partial responses and tests with injected transport. Live smoke tests are explicit opt-in and use synthetic state with a strict call budget.

## Reuse

Pi registers a tool backed by the library. Other harnesses can execute the CLI. An MCP wrapper can be added without changing decision logic. SDK and CLI releases must carry compatible versions and pass installation/import tests from the exact published artifacts.
