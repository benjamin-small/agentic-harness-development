# Using the Jev tool

Contract fixtures and live library/CLI requests were verified on 2026-10-01 for the v2026.1001.190334 candidate. Earlier releases reject the observed model revision; consult the [model-resolution lesson](../memory/model-alias-resolution.md). Live coverage is one synthetic three-question fixture, not general accuracy.

1. Locate the **pinned toolkit installation**, then run its `node_modules/.bin/jev --version`. In a built source checkout, use `node dist/src/jev/cli.js`. A skill directory alone does not install the executable.
2. Read the selected local question-design topic. Prepare `{id, state, questions}` as JSON. Use meaningful instructions; IDs are correlation labels. Multiple questions share state and do not consume each other's answers.
3. Run `jev validate --input request.json`. This is local and needs no secret. Keep the request in a private temporary or scoped working directory; never commit confidential state.
4. Ensure invocation is within the host's authorization and that `OPENROUTER_API_KEY` is injected. Do not ask for secrets in chat, pass them as arguments, or read unrelated credential stores. The CLI does not load `.env` automatically.
5. Run `jev decide --input request.json`. For independent states, use `jev batch --input requests.jsonl --concurrency 4`. Use `--max-retries 0` when only one API attempt is authorized. Default transient HTTP retries permit up to three attempts per request.
6. Parse JSON stdout and check `ok` before reading answers. In batches, correlate `sequence` and `requestId`; results arrive in completion order, and any failed request makes the exit nonzero. Inspect JSON stderr for setup or stream failures. Preserve successful results from a partial batch.
7. Use a returned value as evidence for the host's workflow. Do not interpret confidence as proven correctness or allow a model response to override deterministic authorization checks.

The library export is `@benjamin-small/agentic-harness-development/jev`: use `createJevClient`, `validateRequest`, and `decideBatch`. Native Pi/MCP wrappers remain future work.

For exact bounds, schema, retries, cancellation, and TypeScript examples, open the packaged `docs/jev-runtime.md` from the toolkit root. The skill intentionally carries only the procedure and focused expertise; the software manual travels in the same versioned package. Source: [runtime manual](https://github.com/benjamin-small/agentic-harness-development/blob/v0.1.0-alpha.2/docs/jev-runtime.md).
