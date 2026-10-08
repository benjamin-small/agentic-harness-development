# Direct Jev CLI verification — 2026-10-08

This is unreleased source on base `3faea60799f59cf35fe5d1dcaa85b54d8ca2a534`.
The personal runtime remains pinned to `2026.1003.200942`; the separately staged
wrapper has SHA-256 `65f6607e29841e1bf31463e5a933dd7578eec8bd4d22cb59175454826c5f73b0`.
No release or native compatibility across all harnesses is claimed.

## Implementation and checks

The absolute POSIX launcher starts a short-lived TypeScript wrapper. It resolves
pins, reads only the configured local cached credential for inference, passes
structured streams through, defaults to zero retries, and retains persistent call
and outcome logging. It neither registers a server nor fetches credentials.

`npm run check` passed 86 tests, formatting, typechecking and nine-component
catalog validation. Coverage: 99.56% lines/statements, 96.92% branches, 98.90%
functions. Tests include scoped pin precedence, dangling pins, credential file
restrictions, predispatch log access, subprocess signals and Node preload removal.
A local npm tarball was installed into a temporary consumer with scripts disabled;
packaged CLI/library recipes and outcomes passed with mocked transport. Packaged
`jev-run status` resolved the personal runtime offline without reading a key.
This tarball retains the existing version string and is not a published release.

## Adversarial review

Four design and four implementation specialists were launched with
`collaboration.spawn_agent` and `fork_turns: none`, under Codex on macOS.
Filesystem permissions were shared; read-only review was an instruction, not an
isolated mount. Reviewers did not recursively delegate or make inference calls.

| Role        | Final verdict | Evidence and disposition                                                                                                               |
| ----------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Claude Code | ready         | Startup environment, scoped auth, permissions and log recovery reviewed. Dangling pin and recovery clarifications fixed and rechecked. |
| Codex       | ready         | Found dangling symlink fallback; fixed with lstat and regression coverage. Verified predispatch-only permission rerun guidance.        |
| Pi          | ready         | Reviewed pin/config precedence, streams, scopes, cancellation and local credentials.                                                   |
| OpenCode    | ready         | Reviewed launcher/config boundaries, default retries, cancellation and failure guidance.                                               |

Final runner source SHA-256:
`9d303a7790faa9c7fad99b62c45c8e1279e51b294a188dd9b9d43d781000b52e`.
Final runner-test source SHA-256:
`28477185453265ca626901237528b3de90ccf1a2c2805dd275c45b5afffc697a`.
Native Claude Code, Pi, OpenCode and Windows execution remain unverified.

## Fresh-context behavior

A fresh Codex agent received a synthetic six-finding review task without naming
Jev in the task. It selected the skill, but the first wrapper build encountered
sandbox log-write denial before provider dispatch. It correctly did not replay
runtime IO_ERROR and recorded unavailable, call ID
`3dc58991-6dd6-47d0-8bec-ef68db5c1838`.

This exposed the need for a wrapper preflight. The fix checks log access before
reading credentials or spawning inference, with permission-only
LOCAL_ACCESS_REQUIRED and exact-command host permission recovery. Later runtime
logging errors remain non-replayable. The updated personal launcher and complete
skill were installed with backups; private expertise, key and runtime pin were
preserved.

A separate fresh-context arithmetic/prose control used no tools. These are bounded
observations, not a claim that natural-language skill selection is deterministic.

After the fix, another fresh Codex agent independently selected Jev for the same
ordinary review task. The sandbox preflight returned LOCAL_ACCESS_REQUIRED;
rerunning the identical command through supported permission escalation completed
one real inference with retries disabled. Parent inspection of the persistent log
confirmed start, exactly one attempt, successful finish and correlated outcome:

- Call ID: `bb34cc39-2716-4c9a-8caf-3208dcf145c6`.
- Recipe: `finding_support`, CLI surface; model `typesafe/jev-1.13-20260917`.
- Finish: 2026-10-08 14:58:49 UTC, 379 ms recorded call duration, one attempt.
- Outcome: `overridden / contrary_evidence`. The agent accepted five judgments
  but overrode the insufficient-evidence judgment on an explicit cache assignment,
  explaining its conventional cache-API assumption. It retained final judgment.

No secret-manager read or MCP invocation occurred. Host execution permission can
still be required; the wrapper makes the predispatch recovery explicit rather than
bypassing the sandbox. This proves one fresh Codex task on the current Mac, not
reliability across all prompts, a performance benchmark, or other native hosts.

## Release preparation follow-up

CodeQL flagged whole-object status serialization because the result union also
contains an invocation environment. The release candidate now serializes only
the eight existing status fields. A subprocess regression asserts exact keys
and absence of an inherited credential sentinel in stdout/stderr. All four
specialists rechecked the narrow correction; final verdicts ready. The full
86-test check passed with 99.57% lines/statements, 97.02% branches and 98.90%
functions. This supersedes the earlier coverage measurement above.
