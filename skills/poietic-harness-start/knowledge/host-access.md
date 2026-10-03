# Portable startup checks and host permissions

Repository contract, verified against the maintenance CLI on 2026-10-03. Applies
to human harnesses and provisioned agents. Permission syntax is host-specific;
a skill or AGENTS.md instruction cannot grant operating-system or sandbox access.

## Provision once

During authorized installation, record these non-secret values in this component's
`knowledge/local/INDEX.md` and a linked startup-command topic:

- Host/harness, execution identity, installation scope, and verification date.
- Absolute Node executable, pinned toolkit executable, and exact pin file.
- Dedicated writable release-cache path, outside immutable runtime content.
- Exact command, permission rule/profile or supervisor configuration, and reload needs.
- Cold lookup and cache-hit results from the actual execution context.

The shared command, available since v2026.1002.2233, is:

```sh
/absolute/node /absolute/runtime/node_modules/@benjamin-small/agentic-harness-development/dist/src/maintenance/cli.js poll --config /absolute/pin.json --cache /absolute/writable/latest-release.json --max-age 300 --timeout-ms 1500
```

Prefer explicit paths over PATH discovery. The cache contains public release
metadata, not credentials. The command reads the installation and pin, writes
only its selected cache, and calls the fixed public GitHub releases endpoint.
No API key, credential-manager lookup, inference, dependency installation, or
runtime update belongs in this check. Preserve private local configuration on
upgrades, rechecking executable paths and any grants tied to them.

## Grant the required access in the host

The execution context needs read/execute access to Node and the installed runtime,
read access to the selected pin, and write access to the cache directory. Online
refresh requires DNS/TLS and outbound HTTPS to `api.github.com`. The lookup does
not follow redirects. GitHub asset downloads and npm access belong to separately
authorized installation, not startup checking.

Choose the host's supported mechanism: a command-specific exception for a reviewed
fixed wrapper, a restricted filesystem/network profile, or a provisioned supervisor
step. A command exception runs outside that sandbox; it is not itself a domain
allowlist. Avoid granting arbitrary shell/Node execution. Do not change global
permissions, retry indefinitely, or substitute another network tool after a denial.
Report the unavailable check and continue interactive work.

| Consumer                        | Registration and access                                                                                                                                          | Verification boundary                                                                                                                  |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Codex, standard personal layout | Use [Codex access](codex-access.md) and the bundled no-argument wrapper. Record the exact command rule locally.                                                  | Local CLI policy evaluation and live/cache checks verified; rule loading needs a fresh session.                                        |
| Claude Code                     | Use the existing maintenance plugin's SessionStart hook, or configure a host-owned poll invocation; avoid duplicate checks.                                      | The plugin uses `session-start`, not this cached poll wrapper. Hook execution and its permissions must be verified in the target host. |
| Pi and other human harnesses    | Register the portable skill if supported, or read its entrypoint from the recorded path. Use a supported startup hook/extension or a short standing instruction. | No new native adapters or permission syntax are supplied or claimed for these hosts.                                                   |
| Long-running agent/container/CI | Provision Node, runtime, pin and cache under the service identity. Run the command in the supervisor/startup phase with declared egress and filesystem access.   | Test under that identity and container; host-shell success is insufficient.                                                            |

Use native skill invocation syntax only where supported. The portable standing
instruction is: “At session start, run the installed poietic-harness-start skill.”
For an autonomous service, direct executable invocation avoids a model turn.
An instruction-driven human harness still uses its model to initiate the command;
it is not a guaranteed lifecycle hook.

## Run and interpret

Run once per distinct installation/pin pair at session start. A successful cache
entry is reused for five minutes; an expired entry is refreshed. Failed refreshes
are unavailable, not evidence that the installation is current. `--offline` uses
only a still-fresh cache, and cannot establish current availability after expiry.

Exit 0 means no newer release, 1 means an update is available, and 2 means unknown
or invalid setup. Treat exit 1 as information, not an execution crash. Inspect
`alignment` independently: a runtime can match its pin while a newer release
exists. Inspect `latest.status` and `polling.source` before claiming online success.
Interactive startup reports actionable results and continues. Service supervisors
choose their readiness policy explicitly; temporary GitHub failure need not stop
the application. Nothing here authorizes upgrades or changing pins.

## Verify installation

Run from the actual harness sandbox/hook/service, not only a normal terminal:

1. With a fresh dedicated cache, confirm `latest.status: available` and
   `polling.source: network`; verify that only the designated cache was written.
2. Repeat within five minutes and confirm `polling.source: cache` and `cache: hit`.
3. Confirm the command cannot be repurposed by substituting another executable,
   script, endpoint or destination under its permission grant.
4. Record any remaining approval prompt or required reload. Do not claim
   prompt-free startup until tested in a fresh session with the installed policy.

Keep executable installation and scoped upgrade procedures in the update skill.
This contract supplies deterministic checking; an automatic cross-harness updater
is still future work.
