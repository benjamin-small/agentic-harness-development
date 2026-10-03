# Jev native tool access

Introduced in **v2026.1003.200942**, 2026-10-03. `jev-mcp` is an opt-in stdio MCP adapter
over the existing Jev TypeScript library. `jev decide` / `batch` and direct
imports remain supported. This adds native tool discovery, not a second decision
engine or automatic compaction. The bootstrap planner stays read-only and the
Claude maintenance plugin does not install this server.

## Host configuration

Build/install an exact toolkit artifact using Node.js 24 or 26. Register its
absolute `node_modules/.bin/jev-mcp` path in the host's MCP configuration. Keep
runtime files separate from writable logs and skill expertise. Example Codex
configuration (replace paths with the selected installation):

```toml
[mcp_servers.jev]
command = "/absolute/runtime/node_modules/.bin/jev-mcp"
tool_timeout_sec = 60

[mcp_servers.jev.env]
JEV_API_KEY_FILE = "/absolute/private/openrouter-api-key"
JEV_LOG_PATH = "/absolute/writable/jev/calls.jsonl"
JEV_ALLOWED_DATA_SCOPES = "public,synthetic"
```

Alternatively inject `OPENROUTER_API_KEY` into only the server process through
the host's secret mechanism. Use exactly one credential source. Never put a key
literal in command arguments, prompts, a repository, or shared configuration.
The file source must be an absolute owner-owned regular file with no group/other
permissions, at most 4096 bytes, and not a symlink. Keep its parent directory
owner-only. Missing credentials leave offline discovery/status available;
explicitly invalid file configuration fails startup. There is no secret-manager
lookup, `.env` loading, credential refresh, arbitrary endpoint, or model-supplied
filesystem path. Missing logs prevent dispatch through the shared library.

`JEV_ALLOWED_DATA_SCOPES` accepts `public`, `synthetic`, and explicitly configured
`private`. The default is `public,synthetic`. These are caller declarations,
**not content inspection or authorization**. The host must enforce actual
provider disclosure permissions and any per-call approval. Do not configure
automatic approval to bypass an earlier refusal; a persistent MCP process may
have different permissions from a sandboxed shell. Configuration must reflect
the granted scope before enabling real inference. Installation is not consent.

Existing sessions may need reload. Verify `jev_status`, native discovery, and a
bounded authorized synthetic call separately. A successful status response proves
configuration only; missing tools are not fixed by repeatedly reading the skill.

## Tools and limits

- `jev_evidence_relevance`: classify 1–32 excerpts against an objective.
- `jev_finding_support`: check evidence for 1–32 candidate findings.
- `jev_decide`: shared validated `id/state/questions` request.
- `jev_batch`: 1–8 separate requests, at most two concurrent calls. Validate all
  requests before dispatch; return partial results with input `sequence`.
- `jev_status`: local configuration, model and scope; no inference.
- `jev_record_outcome`: record `used`, `overridden`, or `unavailable`, without
  free text or provider traffic. Used/overridden requires a successful call ID
  issued by this server session; an ID can be consumed once. Last 1024 IDs are
  retained in memory. Consumption occurs before persistence; ambiguous log failures
  keep the ID consumed and must not be retried. After restart use the CLI/library
  caller-report interface.

One inference invocation runs at a time per server process; overlapping calls
return `busy` without dispatch. Batches share this gate. Each request has the
shared 30-second deadline and zero retries. A 45-second total batch budget stops
further admission, aborts active work and returns completed/per-request results
with `deadlineExpired: true` through a normal response, below the configured
60-second host timeout. Cancellation/disconnection aborts active work, including
stdin EOF and broken output. **Native MCP request cancellation or host timeout
suppresses the response:** completed answers and call IDs can be lost even when
the connection stays open. There is no recovery API. Partial results are available
only in a normally returned response. Never replay a cancelled or partial batch,
or an ambiguous/logging failure, automatically. Separate server processes do not share a concurrency limit.

Recipes, input examples, uncertainty handling and feedback are documented in
[Jev recipes](../skills/jev/knowledge/recipes.md). Results provide both MCP text
and structured content. Call IDs and allowlisted recipe metadata reach the same
persistent log as CLI/library calls; input text and credentials do not.

## Verification and portability

`test/jev-mcp.test.ts` exercises SDK discovery, input/scope checks, missing
credentials, no retries, correlation, recipe results, partial batches,
cancellation, concurrent admission and stdio startup with injected transport.
`JEV_ADOPTION_EVAL=1 npm run jev:adoption -- /absolute/private/results` runs fresh
Codex sessions with synthetic tasks and a mock Jev provider. Positive prompts
do not name Jev; default-use policy is ambient. Negative cases cover arithmetic
and prose. Results separately measure actual dispatch and reported use.
It uses the existing Codex login without copying credentials and uses the supported automatic approval reviewer and workspace sandbox. Native Codex model runs may consume account usage.

This is not a provider accuracy or speed benchmark. Native Claude, Pi and
OpenCode discovery/execution remain separately unverified; a stdio server alone
does not establish compatibility with their agent permission or inheritance
models. The native Pi extension remains planned.

Sources checked 2026-10-03: [Codex MCP configuration](https://learn.chatgpt.com/docs/extend/mcp),
[official TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/server).
This implementation pins SDK v1.32.0 and uses its protocol server with explicit
JSON Schema input validation plus the shared Jev validator.
