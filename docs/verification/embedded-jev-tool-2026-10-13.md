# Embedded Jev component verification — 2026-10-13

The user selected a separate `tools/jev/` implementation component while keeping
`skills/jev/` as usage guidance. Generic harness instructions/catalog and release
composition remain at the root. The change was prepared in an isolated worktree;
pending Blog-Review work and the personal installation were preserved.

## Reviewed implementation

Base: `c7f257b408ccd25027272ecd7780b532e8e03d30`.
Implementation snapshot: `b55b2dd15a208ae63ef994a30fd76571695fbc45`.
This note records the completed review separately from that snapshot.

Each reviewer used `collaboration.spawn_agent` with `fork_turns: none`, a canonical
role path, and a bounded proposal or implementation packet. Design and final
implementation passes used separate fresh contexts. All roles ran under Codex
on macOS; read-only behavior was instructed, not tool-enforced. No reviewer
recursively delegated or performed a native harness compatibility test.

| Role        | Design                    | Implementation | Findings and disposition                                                                           |
| ----------- | ------------------------- | -------------- | -------------------------------------------------------------------------------------------------- |
| Claude Code | ready                     | ready          | Minor design omission: tool indexes/privacy patterns; implemented and verified. No final findings. |
| Codex       | ready                     | ready          | Same minor ownership/privacy omission resolved. No final findings.                                 |
| Pi          | ready                     | ready          | No design or final findings; independently ran 13 contract/boundary/runner checks.                 |
| OpenCode    | ready after clarification | ready          | Tool indexes/privacy omission resolved in the design packet and implementation. No final findings. |

All reviewers reported Jev `not-needed` for deterministic paths, metadata,
compiler graphs and privacy/consumer checks. No live inference was dispatched
for this restructuring. The parent reconciled all reviews with no unresolved
findings or exceptions.

## Acceptance evidence

- `npm run check`: 91 passing tests, nine catalog components, tool-manifest
  validation, formatting and independent TypeScript checks. Aggregate coverage
  includes both runtime trees: 99.75% lines/statements, 98.93% functions,
  97.20% branches, on Node.js 26.10.0/macOS.
- The independent `npm --prefix tools/jev test` command passed 45 tool tests.
  Compiler resolved-file graph checks confirm no generic source imports the
  embedded implementation and no tool TypeScript imports repository internals.
- Runtime tests preserve typed contract, credentials, scope, logging,
  cancellation and retry acceptance. Added fixtures verify declared embedded
  binaries, legacy layouts, lexical/realpath containment, absent/unsafe targets
  and synchronized stamp behavior. The tool-local pin contract conforms to
  generic maintenance validation.
- Package checks confirm explicit inclusion of tool runtime/docs/manifest and
  installer, exclusion of tool source/tests/private notes, and no stale root Jev
  output. A synthetic forcibly tracked private tool note prevents source packing.
- Exact local snapshot `b55b2dd` was packed and installed in a fresh temporary
  consumer. Checksums, public `/jev` import, `jev`/`jev-run`, offline runner with
  absent credentials, resources/manual/installer, mocked library/batch/recipes/
  logging/outcomes, generic maintenance and Claude plugin checks passed.
- The new source wrapper also resolved the actual existing personal installation
  offline through its legacy declared binary. No personal pin/configuration,
  credential, local expertise or log setting was changed. Unrelated primary
  working-tree file fingerprints remained unchanged.

## Scope and migration

At review time, this was a local, unreleased layout change. Local candidate artifact verification
reused the existing version for testing; publication requires a new timestamp
and the normal release gates. Source/manual/installer paths move under the tool;
public command/library names remain stable. A future explicit update must refresh
the wrapper because older wrappers hardcode the removed root runtime path. The
new wrapper supports retained older declared layouts. See the
[wrapper migration](../../tools/jev/knowledge/toolkit-contract.md#wrapper-migration).

No fresh native Claude, Pi or OpenCode session, actual personal wrapper switch,
provider live call or publication was performed for this change. Filesystem and
compiler boundaries are architectural checks, not a security sandbox claim.

## Release preparation

Prepared `v2026.1014.5143` from the isolated PR #17 branch, synchronizing root/lock/tool
manifests. Only the reviewed embedded-tool change and release documentation are
included; pending Blog-Review files and catalog/schema/runtime/test changes remain
outside the branch. Publication and downloaded-asset verification are separate
release gates; the earlier review evidence above remains tied to its exact snapshots.

## Tagged workflow fixture repair

PR #17 merged at `0deea4d5cdbeb423862f2d622493e56e55e363ce` after CI and CodeQL passed. The tagged release workflow for `v2026.1014.5143` failed before publication: the synthetic private-expertise fixture inherited GitHub tag metadata and hit the tag/version guard before its intended assertion. No assets were published; the failed tag is preserved.

Four fresh design reviewers (Claude Code, Codex, Pi and OpenCode roles under Codex/macOS) agreed the fixture should copy its environment and clear only `GITHUB_REF_TYPE` and `GITHUB_REF_NAME`. Production packaging is unchanged. The regression exercises ordinary and conflicting-tag parents and independently verifies mismatched tag rejection. Jev was not needed for deterministic guard ordering and environment propagation.

Prepared replacement `v2026.1014.21134` in the isolated worktree. Blog-Review remains outside the release. Implementation snapshot `8c248b8fcf1783a503f5b7ff17ce801182b7ae1e` passed the tagged-parent regression (4/4), full matching-tag packaging (91 tests and checks) and exact-tarball fresh-consumer verification. Four new fresh contexts, again launched with `collaboration.spawn_agent` and `fork_turns: none`, returned ready: Claude Code, Codex, Pi and OpenCode. No findings remain; Claude Code and Codex independently reran the tagged packaging regressions. All reported Jev not-needed for these deterministic checks. Publication and downloaded-asset verification remain separate release gates.
