# Direct launcher

Introduced in release 2026.1008.162714 (2026-10-08). The short-lived
`jev-run` wrapper uses the existing pinned CLI. No daemon or MCP server is involved.

## One command

During setup, record the absolute personal launcher in `knowledge/local/command.md`.
Use that command in fresh agents; do not depend on PATH discovery. A configured
personal launcher is usually `~/.local/bin/jev`. For example:

```sh
/absolute/personal/bin/jev finding-support --data-scope public --input findings.json
/absolute/personal/bin/jev evidence-relevance --data-scope public --input excerpts.json
/absolute/personal/bin/jev decide --data-scope synthetic --input request.json
/absolute/personal/bin/jev outcome --input outcome.json
```

Use `--input -` to pass JSON on stdin or JSONL for `batch`. Stdout remains the
runtime's structured result; diagnostics/activity go to stderr. The launcher
resolves the pin, injects the cached key and uses the configured persistent log.
No shell command assembly, key read, or secret-manager discovery is needed per call.
Parse `ok` and retain `callId`; record outcomes after using answers. Recipes have
the same fields and results as [the direct runtime recipes](recipes.md).

`status` is offline and reads no credential; it reports configuration and runtime
identity, not connectivity. `--version`, `--help`, `validate` and `outcome` also
need no credential. Missing configuration/key/runtime fails with sanitized JSON
and exit 2. Never silently retry a dispatched call after an IO/logging failure.
Inference defaults to zero retries; a retry override must be deliberate.

## Setup and precedence

The host provisions a private JSON file at `~/.config/poietic-harness/jev.json`:

```json
{
  "schemaVersion": 1,
  "pinPath": "/absolute/user/.poietic-harness.json",
  "runtimeCacheRoot": "/absolute/versioned/toolkit/cache",
  "credentialFile": "/absolute/owner-only/openrouter-api-key",
  "logPath": "/absolute/writable/jev/calls.jsonl",
  "allowedDataScopes": ["public", "synthetic"]
}
```

The config contains paths, never a secret value. For deployments/custom layouts,
`--config /absolute/file` takes precedence over `JEV_RUN_CONFIG`, then the default.
Explicit config selects its own pin and bypasses project-pin discovery. Otherwise
the nearest ancestor `.poietic-harness.json` from the working directory takes
precedence over the personal pin. Invalid/inaccessible pins or missing versions
fail without personal fallback or downloads. Runtime path is
`<runtimeCacheRoot>/<version>/runtime/node_modules/@benjamin-small/agentic-harness-development`.
Its package name/version must match. Recipes/outcomes require a release at least
`2026.1003.200942`; older pins can use `decide` or be explicitly updated.

Inference requires `--data-scope public|synthetic|private` allowed by the config.
This is caller attestation, not content inspection or new disclosure authority.
Retain applicable project/data restrictions. The wrapper ignores an inherited
OPENROUTER_API_KEY and reads only the configured local cache for inference. It
rejects links, FIFOs, directories, oversized/empty keys and, on POSIX, keys not
owned by the caller or readable by other users. No network credential fallback.

Provision an absolute Node 24/26 executable and immutable wrapper entrypoint.
Use the packaged `scripts/install-jev-launcher.mjs` with explicit `--node`,
`--runner` and `--destination` paths; it refuses an existing different launcher.
The generated POSIX shell launcher unsets NODE_OPTIONS/NODE_PATH **before** Node
starts, then execs the wrapper. Direct `node runner-cli.js` or `jev-run` assumes a
trusted Node startup environment. No shell-profile or global permission changes.
Windows-native launchers remain unverified.

The wrapper inherits standard streams, forwards SIGINT/SIGTERM, returns child
exit status, and escalates cancellation to SIGKILL after two seconds. Cancellation
can follow a billed dispatch; do not automatically replay. Host-specific shell
cancellation must be verified independently. Configuration and installed runtime
code are trusted operator-owned inputs, not a sandbox for untrusted repositories.

Record wrapper source/hash separately from the runtime pin. During updates,
preserve configuration/private expertise, stage the wrapper, back up the old
launcher and deliberately replace it; old published runtimes do not include this
wrapper. Verify offline status, actual command discovery or absolute invocation,
stdio/exit behavior and skill reload separately from live inference.

If the wrapper returns `LOCAL_ACCESS_REQUIRED`, it has not read the key or dispatched inference. Use the host permission flow to rerun the exact command with unchanged input/scope. Do not treat other failures as permission to retry. A successful preflight cannot guarantee later logging; runtime `IO_ERROR` remains non-replayable.
