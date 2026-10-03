# Harness reviewer verification — 2026-10-03

Historical snapshot: this pass preceded the Jev dependency/default-use change.
Its four-component selection and hashes apply only to that earlier snapshot.
See [the subsequent Jev default verification](jev-defaults-2026-10-03.md) for
the current five-component selection and actual fresh-child inference.

Result: all four specialists returned **ready** for the portable role definitions
and repository review procedure after reconciliation. This is source and
documentation review under Codex, not native execution in four harnesses.
Changes are unreleased, based on commit
`1aa90cda28e691b1d06a7509c229d50d9f69913f` plus working files. The separate pending
maintenance-skill rename was excluded from this review's scope.

## Dispatch and evidence

The parent used `collaboration.spawn_agent` with `fork_turns: none` for four design
reviewers and four new implementation reviewers. Each received the task, role
path, relevant source paths, implementation assumptions and verification limits.
Reviewers shared the macOS workspace and inherited available tools and
workspace-write permissions. Read-only review was instructed, not technically
enforced. Concurrency was bounded by queuing the fourth reviewer.

The execution host was the current Codex desktop session. Target native harness
versions were unspecified. Applicable host instructions remained available;
fresh history did not imply filesystem, credential or tool isolation.

| Specialist  | Design corrections incorporated                                                                                                       | Implementation outcome                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Claude Code | Document AGENTS.md discovery/precedence, native registration, inherited context, permission boundaries and parent-only coordination.  | Ready; no findings. Refreshed Claude memory documentation.                                         |
| Codex       | Record actual spawn settings and effective permissions; distinguish read-only prose from enforcement and parent permission overrides. | Ready; no findings. Refreshed official subagent documentation and probed catalog selection.        |
| Pi          | Use current upstream documentation, extension-based delegation, explicit scope, project trust and inherited process authority.        | Ready after clarifying the mandatory implementation pass. Native Pi behavior was not tested.       |
| OpenCode    | Distinguish version-specific configuration, explicit workflow loading, native registration and permission enforcement.                | Ready after clarifying the mandatory implementation pass. Native OpenCode behavior was not tested. |

Pi and OpenCode independently found that the changelog promised both design and
implementation review while the workflow explicitly mandated only the first.
The parent added an explicit requirement for all four fresh implementation
reviews before readiness. Both reviewers inspected this narrow correction and
closed the finding in follow-up turns. Those follow-ups were continuations of
their independent implementation reviews, not additional fresh-context passes.
No blocking or major findings remained.

Claude reviewed workflow SHA-256
`ecb9733183421a1ba5a9a30fbef8115c8a46eef022327d19fb63b186907ca335`
before that clarification. Codex and the Pi/OpenCode follow-ups reviewed the final
workflow SHA-256
`ab47ff33449ef8e586002597604480f27ec3f6cff77d38603088ba7a3c96b51a`.
Role entrypoints were unchanged during implementation review:

```text
claude-code-reviewer 66f42d76af507811bc3e5201145d356c54e5a77ab6e94073110dd26a39adc210
codex-reviewer       95a9767f5b647218ab7fd40f74f5e6c61f5596485f3c630e898fa69c1011b314
pi-reviewer          088c147f5bb47869365415625da25e569ef2ca393a8236c9f3a1a7d95becb8d0
opencode-reviewer    28d27f44b669ded5a92478b0d402fafff1518ad21555443764c9c1ea90cb55d7
```

## Validation and limits

`npm run check` passed formatting, typechecking, all **72 tests** and validation
of **9 catalog components**. Coverage was **99.81% lines/statements, 98.08%
branches and 100% functions**. Tests cover opt-in selection of all four roles,
fresh invocation metadata, absence of software/native destinations, and exclusion
of private component expertise from Git and npm packages.

The Codex reviewer independently ran catalog validation and project planning:
exactly four instructions-only reviewers were selected, with no software
dependencies and null native destinations. Source-backed harness guidance lives
in each role's indexed knowledge directory.

Native agent registration/discovery, execution in Claude Code/Pi/OpenCode,
version-specific native fresh sessions, and enforced reviewer isolation remain
unverified. The gate is a cooperative parent instruction, not a lifecycle hook or
CI enforcement. No release was published by this work.
