# OpenRouter integration

Verified against upstream documentation on 2026-10-01. The Decisions API is alpha; re-check its schema before implementing or updating transport code.

- Endpoint: `POST https://openrouter.ai/api/alpha/decisions`.
- Request model alias: `typesafe/jev-1.13`; observed and documented response revision: `typesafe/jev-1.13-20260917`. Preserve the returned revision; do not require it to equal the request alias.
- Authentication: bearer token from `OPENROUTER_API_KEY`; JSON request body.
- Body: `model`, `state`, and a map of named `questions`.
- A choice question has `type: "choice"`, instructions, and a criteria map keyed by option.
- A score question has `type: "score"`, instructions, and ordered criteria.
- A noul question has `type: "noul"`, instructions, and optional true/false criteria. If supplied, both criteria are required.

The response has typed answers and usage. Confidence, distributions, and cost may be optional in the schema; consumers must handle missing metadata explicitly. Do not require every field shown in a cookbook example.

OpenRouter also exposes `/api/v1/systemone` for TypeSafe SDK compatibility. Keep that transport separate from the Decisions request/response contract.

Sources: [OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev), [Decisions schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request), [SDK guide](https://openrouter.ai/docs/guides/community/typesafe-sdk).

## Repository implementation status

Toolkit 0.1.0-alpha.2 introduced the TypeScript library, CLI, batching, validation, cancellation, and bounded retries. Start with [tool use](tool-use.md), then load the packaged runtime manual if needed. The 2026-10-01 live check verified library and CLI requests with all three question types after fixing resolved-model validation for v2026.1001.190334. Earlier releases reject the observed revision. See the [observed lesson](../memory/model-alias-resolution.md); this limited check is not a quality benchmark. A missing client or credential is a setup limitation, not a model result.

Never place credentials in a request example, project selection, skill file, or stdout. Any live invocation sends the provided state to the configured service and can incur usage charges.
