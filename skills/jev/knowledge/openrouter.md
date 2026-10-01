# OpenRouter integration

Verified against upstream documentation on 2026-10-01. The Decisions API is alpha; re-check its schema before implementing or updating transport code.

- Endpoint: `POST https://openrouter.ai/api/alpha/decisions`.
- Initial pinned model: `typesafe/jev-1.13`.
- Authentication: bearer token from `OPENROUTER_API_KEY`; JSON request body.
- Body: `model`, `state`, and a map of named `questions`.
- A choice question has `type: "choice"`, instructions, and a criteria map keyed by option.
- A score question has `type: "score"`, instructions, and ordered criteria.
- A noul question has `type: "noul"`, instructions, and true/false criteria.

The response has typed answers and usage. Confidence, distributions, and cost may be optional in the schema; consumers must handle missing metadata explicitly. Do not require every field shown in a cookbook example.

OpenRouter also exposes `/api/v1/systemone` for TypeSafe SDK compatibility. Keep that transport separate from the Decisions request/response contract.

Sources: [OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev), [Decisions schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-questions-and-answers-request), [SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk).

## Repository implementation status

This release does not ship an API client or executable Jev command. The [runtime contract](https://github.com/benjamin-small/agentic-harness-development/blob/v0.1.0-alpha.1/docs/jev-runtime.md) defines the planned TypeScript library, CLI, batching, validation, cancellation, and retry behavior. A missing client is a setup limitation; it is not a model result.

Never place credentials in a request example, project selection, skill file, or stdout. Any live invocation sends the provided state to the configured service and can incur usage charges.
