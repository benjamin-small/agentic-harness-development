# Jev task-data policy verification — 2026-10-13

The user requested removal of Jev-specific sensitivity restrictions: withhold
only information they would also withhold from the OpenAI API. Canonical Jev
guidance now applies that boundary to relevant private/sensitive task context.
Existing-install migration is explicit; host permissions, paid-inference authority
and explicit user/project restrictions remain applicable.

## Reviewed snapshot

Base HEAD: `fb7622c6e9b3cde7a0ae0231dfdac6b171186d1a`, with preexisting
Blog-Review/catalog work excluded from this task. The task-only implementation
diff relative to the captured starting worktree had SHA256
`4d956accfecdf5dd875f4f3b0c5846cbe3bfaed3438a2219fb1d8a5a7a7a3e36`.
It covered the Jev entrypoint, knowledge index/default-use/tool-use/launcher/new
task-data topic, SECURITY.md, implementation plan and changelog. This note records
the completed reviews separately from that implementation snapshot.

## Independent reviews

Each reviewer was started with `collaboration.spawn_agent`, `fork_turns: none`,
its canonical role path and a bounded proposal packet. Design and implementation
passes used separate fresh agents. All roles executed under Codex on macOS with
the same host tools; read-only behavior was instructed, not tool-enforced. No
reviewer recursively delegated.

| Role        | Design | Implementation | Findings/disposition                                     |
| ----------- | ------ | -------------- | -------------------------------------------------------- |
| Claude Code | ready  | ready          | No actionable findings; config preservation checked.     |
| Codex       | ready  | ready          | No actionable findings; policy and migration checked.    |
| Pi          | ready  | ready          | No actionable findings; portable guidance checked.       |
| OpenCode    | ready  | ready          | No actionable findings; installed/source parity checked. |

All reviewers reported Jev `not-needed`: their policy, scope-validation and file
comparison checks were deterministic. No inference was dispatched for these
reviews. The parent reconciled all four reviews with no unresolved findings.

## Validation and personal installation

- `npm run check` passed formatting, TypeScript, all 87 tests, coverage and
  catalog/resource validation. Coverage: 99.57% lines/statements, 98.90% functions,
  97.02% branches. No runtime code or tests changed for this task.
- The user's existing launcher config gained only `private` in
  `allowedDataScopes`; other paths/settings and the runtime pin were preserved.
  Offline status reported `public`, `synthetic`, `private`, runtime
  `2026.1008.162714`, and `liveVerified: false`.
- All six changed canonical skill files in the personal installation matched
  repository source byte-for-byte. Its local command and standing-authorization
  records supersede the earlier public/synthetic-only restriction. Existing
  local expertise was preserved. Claude's existing skill symlink still resolves
  to that shared installation.
- An offline fixture imported `prepareInvocation` from the exact installed
  runner and accepted `--data-scope private` using the configured scope list, a
  fake credential and a disposable runtime fixture. It executed no CLI child
  and made no network request.

These checks verify the local policy/configuration update, not native discovery,
fresh-session behavior in each harness, live private-data inference or provider
retention equivalence. These policy checks preceded release preparation.

## Isolated release preparation

Release `v2026.1013.214916` was prepared from a separate worktree at the base HEAD
above, carrying only the Jev policy diff and release documentation. Pending
Blog-Review role, catalog/schema/runtime/test changes and verification files were
excluded. `npm run check` on this isolated tree passed all 86 baseline tests and
validated nine components, with unchanged measured coverage. The earlier 87-test
measurement above describes the original mixed working tree, not this release.
Publication and downloaded-asset verification are separate release gates.
