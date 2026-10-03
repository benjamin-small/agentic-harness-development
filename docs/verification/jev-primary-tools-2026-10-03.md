# Jev selection, native tools and outcomes — 2026-10-03

Local unreleased implementation on macOS, Node.js 26.10.0, Codex CLI 0.156.1.
Jev was already callable through the CLI/library. This work adds recipes,
selection guidance, outcome correlation and a thin stdio MCP interface over the
same client. No native compaction hook or measured speedup is claimed.

## Repository checks and consumer

`npm run check` passed **85 tests**, formatting, TypeScript and validation of
**9 catalog components**. Coverage: **99.78% lines/statements, 100% functions,
98.00% branches**. New regressions cover real stdio EOF, FIFO credentials,
concurrent conflicting feedback, failed persistence, normal deadline partial
results, native cancellation and fixed input/result correlation.

An exact `npm pack` artifact was installed in a fresh temporary consumer using
normal dependency installation with lifecycle scripts disabled. Its stdio
entrypoint passed SDK discovery, a mocked finding-support request and correlated
outcome verification. The final artifact SHA256 is:

```text
4903ec986825b2ee8bcbfac9d78a98a1bc258c5836a91002f0cbb48d946a2e8a
```

This is a local build from dirty source based on
`1aa90cda28e691b1d06a7509c229d50d9f69913f`, with package version
`2026.1003.142920`; it is not the published artifact for that version. The
separate user `local-builds` directory identifies it by archive hash. Existing
release pins and caches were preserved. No commit, tag or release was published.

## Native Codex adoption

The opt-in evaluator ran four fresh Codex processes using the source Jev skill
and default-use guidance as ambient policy. Task prompts did not name Jev.
Provider traffic used a local synthetic fixture, not OpenRouter. Each case
retained the trace, answer and persistent log.

| Ordinary task               | Selected tool            | Successful calls | Correlated reported use |
| --------------------------- | ------------------------ | ---------------: | ----------------------: |
| Prepare an evidence handoff | `jev_evidence_relevance` |                1 |                       1 |
| Check candidate findings    | `jev_finding_support`    |                1 |                       1 |
| Arithmetic                  | none                     |                0 |                       0 |
| Shorten a sentence          | none                     |                0 |                       0 |

An initial noninteractive run selected both positive tools but blocked dispatch
because its approval policy was `never`. The successful run used the supported
`--approve-for-me` reviewer and workspace sandbox, without a bypass flag. This
demonstrates why selection, authorization, dispatch and use are separate measures.
These small synthetic cases establish bounded adoption, not general decision
quality or an end-to-end performance improvement. Outcomes are caller reports.

## Installed discovery and live verification

The complete user Jev skill was refreshed from source while retaining private
expertise. The old skill/configuration were backed up. The verified artifact was
registered as the user Codex `jev` MCP server with an existing owner-only
credential file, persistent log and `public,synthetic` declared data scopes.
No private-data scope or blanket approval bypass was enabled.

A fresh Codex app-server returned all six Jev tools via
`mcpServerStatus/list`. `skills/list` with `forceReload: true` returned Jev enabled
at user scope with zero discovery errors. Existing chats may need a reload.
Other native harnesses were not registered or verified by this work.

The final installed artifact then made exactly one authorized synthetic
finding-support request with zero retries. Two independent function snippets
produced the expected `supported` and `contradicted` labels. The parent checked
them against the snippets and recorded `used`/`accepted`.

- Call ID: `26ceb258-ba45-42c9-b200-147e8a6a72b0`.
- Model: `typesafe/jev-1.13-20260917`.
- Usage: 611 input tokens, 91 output tokens; provider-reported cost `0.000025662`.
- Matching start, attempt, successful finish and outcome records were verified.

An earlier candidate also passed one synthetic request, call ID
`0bc89eee-7ad1-4906-9297-609d590e2ae5`. Neither check establishes broad accuracy.
Runtime input text and credentials were absent from persistent call metadata.

## Independent review and repairs

The parent read the repository review workflow. All four implementation reviews
started through `collaboration.spawn_agent` with `fork_turns: none`, loading
their canonical roles and a bounded packet. They ran under Codex with read-only
instructions; this was not enforced filesystem isolation or four native-host
tests. No reviewer recursively delegated. Jev was not needed for deterministic
reproductions; reviewers did not send repository-specific material externally.

Initial reviewed snapshot:
`a0629e4ddcd1c7c9006ef4162e68b1e8b3afbe4b0c91ca4f336088c892d10c0d`.
All substantive findings were repaired and rechecked:

| Finding                                  | Repair                                                                                 | Review disposition               |
| ---------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------- |
| Duplicate concurrent outcomes            | Consume IDs before awaiting persistence; retain consumption after ambiguous failure    | All affected specialists cleared |
| Stdio EOF left requests running          | Close on input end/close/error and output error; abort lifetime                        | Claude, Pi and Codex cleared     |
| Native cancellation loses batch response | Correct documentation; test response suppression and prohibit replay                   | Claude, Pi and Codex cleared     |
| Batch duration exceeded host timeout     | Internal 45-second budget returns normal partial response below 60-second host timeout | Codex cleared                    |
| Credential FIFO blocked startup          | Nonblocking open plus descriptor validation                                            | OpenCode cleared                 |
| Deadline fixture assumed arrival order   | Select successful fixture by input state                                               | Codex cleared                    |

Claude and OpenCode cleared repair snapshot
`232ff03b6f6b1123fb867747a158e778c3f4c267ec4115a6a6962771ed397d3e`.
Codex and Pi cleared final snapshot
`877017f449ed54dfb9deea0b1859f55fabd09ea3216be205640212f6dab1d206`;
only the deadline test changed between those snapshots. No remaining substantive
review findings. This verification note was added after the reviewed snapshots.
Native Claude, Pi and OpenCode execution remain unverified.
