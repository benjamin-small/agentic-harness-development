# Default Jev verification — 2026-10-03

Result: user-scoped Codex discovery and one explicitly provisioned fresh Codex
child's live Jev inference passed. Default instructions were installed in the
four personal harness configurations on the operator's Mac. Native Claude Code,
Pi and OpenCode execution remains unverified. Source changes are unreleased;
the existing runtime pin remains `2026.1002.2233`.

## Implementation and independent review

The four repository reviewer roles now require the Jev skill. Selecting
`harness-compatibility-review` resolves five components: Jev followed by four
roles. Jev brings `jev-runtime`; portable role destinations remain unset. An
explicit Jev exclusion produces a dependency conflict instead of being ignored.
Personal bootstrap selects Jev as a baseline; existing startup only checks
availability. Detailed default-use, authorization, fallback and child-access
guidance lives in Jev knowledge, with short standing instructions.

All four design and all four implementation reviewers were independently
launched under Codex using `collaboration.spawn_agent` with `fork_turns: none`.
They shared the workspace and inherited available tools and permissions;
read-only review was a behavioral instruction, not enforced isolation. Only the
Codex implementation reviewer was assigned a live test. The others inspected
source and primary documentation without inference.

| Specialist  | Design findings incorporated                                                                                                   | Implementation verdict                                                                                                   |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Codex       | Separate baseline setup from startup repair; carry execution authority, writable paths and fallback; test exclusion conflicts. | Ready; update the earlier verification note to mark its previous dependency snapshot. Resolved by its historical notice. |
| Claude Code | Explicitly expose the skill to children; personal Codex discovery does not establish Claude execution.                         | Ready; verified personal instruction and shared skill symlink, no native Claude run.                                     |
| Pi          | Document reload/collision behavior and inherited environment; inject credentials only into the Jev command.                    | Ready; verified personal instruction and current skill-location guidance, no native Pi run.                              |
| OpenCode    | Explicitly read the skill path; separate discovery from permissions and tool availability.                                     | Ready; verified personal instruction and current discovery guidance, no native OpenCode run.                             |

Reviewed base: `1aa90cda28e691b1d06a7509c229d50d9f69913f`. Unrelated pending
maintenance-skill rename was excluded from reviewer judgments. Snapshot hashes:

```text
docs/harness-review.md
58fee941d31dbc2e0394e98d60d241e476f160e2c4d2bfa8e9ba3a582ace909b
skills/jev/knowledge/default-use.md
8e61e888e235154d123baf859ce369eb1f10668fa1aa77d1303544906fe52a6f
catalog.json
2d0ca3f706f5430b4a91d4265496777e94da7845f23da18260774fcaa68fafb8
```

## Installation checks

The updated installed Jev entrypoint, index and default-use topic match source
bytes. Existing private knowledge and cached credentials were preserved. The
startup availability/bootstrap topics were refreshed separately from the pinned
runtime. Backups and source provenance are recorded in the private installation
record. Global preferences were added to personal Codex AGENTS.md, Claude
CLAUDE.md, Pi AGENTS.md and OpenCode AGENTS.md at the documented default paths.
Claude's personal Jev skill is a symlink to the canonical user-owned shared copy.
No provider credential was exported globally.

A fresh Codex app-server `skills/list` with `forceReload: true` returned Jev
enabled, scope `user`, at the installed shared skill path, with zero discovery
errors. Existing sessions may need reload; custom home/config overrides and
remote identities need their own provisioning. Configuration files alone do not
prove native discovery or default selection in every harness.

## Fresh-child inference

The child received the skill entrypoint, pinned executable, permitted synthetic
data scope, cached-credential locator, private request directory and persistent
log path. Supported execution escalation supplied sandbox access. It validated
the request locally, then made exactly one inference attempt with
`--max-retries 0`, injecting the cached key only into Jev. No Infisical network
lookup or automatic retry occurred.

- Request ID: `codex-fresh-review-20261003`.
- Synthetic question: does a catalog dependency alone establish native child
  execution access? The supplied evidence excluded native execution observations.
- Returned choice: `unverified`, `ok: true`, attempts `1`, process exit `0`.
- Resolved model: `typesafe/jev-1.13-20260917`.
- Persistent call ID: `e0b66170-5fd8-4d89-b03e-f16c484bdd99`.
- Matching start, attempt 1 and successful finish were verified in the persistent
  log; finish at `2026-10-03T14:48:17.820Z`, elapsed `284 ms`.
- Provider-reported usage: 427 input tokens, 48 output tokens, cost `0.000017934`.

The parent independently inspected the returned result and matching log excerpt.
This proves one explicitly provisioned fresh child can execute Jev; the model's
answer does not establish harness compatibility, broad decision quality or a
general speed improvement. Request/result/log artifacts remain private temporary
files; secrets and request contents are not recorded in persistent call metadata.

## Repository validation

`npm run check` passed all **72 tests**, formatting, typechecking and validation
of **9 catalog components**. Coverage remains **99.81% lines/statements, 98.08%
branches and 100% functions**. The updated selection test checks Jev inclusion,
runtime requirement, explicit exclusion failure and portable role destinations.
No release was published by this change.
