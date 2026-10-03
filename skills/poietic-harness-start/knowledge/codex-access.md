# Codex startup command access

Verified 2026-10-03 against Codex CLI 0.156.1 and the [official rules documentation](https://learn.chatgpt.com/docs/agent-configuration/rules).

For the standard `~/.codex` personal installation, install the reviewed
`scripts/check.mjs` from this skill at `~/.codex/poietic-harness/bin/check.mjs`.
Keep this authorized copy outside project-writable roots. It accepts no arguments,
reads the user pin, verifies the runtime package name/version, and invokes the
installed `poll` command with fixed paths and a 1.5-second network deadline. A
successful lookup is cached for five minutes at
`~/.cache/poietic-harness/latest-release.json`. Runtime requires `poll` (available
since v2026.1002.2233). Custom CODEX_HOME/cache layouts use the recorded checker
procedure instead; this helper does not guess destinations.

At explicit setup, record the absolute Node executable and installed helper path
in this skill's `knowledge/local/INDEX.md` and a linked invocation topic. Use:

```sh
/usr/bin/env -u NODE_OPTIONS -u NODE_PATH /absolute/node /absolute/check.mjs
```

Create a dedicated user rule under `~/.codex/rules/poietic-startup.rules`, using
those exact tokens as `pattern` in `prefix_rule(..., decision="allow")`. Never
allow a general `node`, `env`, or shell prefix. The helper rejects appended
arguments. This is a command exception outside the sandbox, not a domain-filtered
sandbox: it trusts the reviewed helper and installed runtime. Re-review executable
changes during updates. More restrictive managed rules still apply.

Validate with `codex execpolicy check --rules <rule> -- <exact command>`, including
negative cases for a different script and `node -e`. Restart Codex to load the
rule. Invoke the exact command as a standalone tool call using the host's
permission flow when required; don't wrap it in shell substitutions or chain it
with other commands. Verify a cold online result and then a cache hit. An active
session may still have its previous policy, so rule evaluation alone is not proof
of a fresh-session invocation without a prompt.

Exit 0 means no newer release, 1 means update available, and 2 means unavailable
or invalid setup. Inspect pin alignment independently. Report actionable results
and continue. The helper never installs, rewrites pins, retrieves credentials,
or invokes inference. Explicit updates still use the update skill and separately
authorized installation operations. This command exception does not authorize
those writes or create an automatic updater.
