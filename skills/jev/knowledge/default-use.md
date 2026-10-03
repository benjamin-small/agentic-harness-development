# Default Jev use and fresh agents

Repository policy, 2026-10-03. Jev is the preferred available skill for bounded
structured decisions across tasks: routing, classification, independent rubric
checks and triage of supplied evidence. Read question design and tool use only
when needed. Use deterministic code for exact checks and the main harness for
research, prose, implementation and final judgment. Do not add inference to every
task or claim measured speed gains without benchmarking. Batch independent
questions sharing state to reduce dispatch overhead.

## Selection triggers

At these natural points, prefer the matching available Jev tool or CLI recipe:

- After local search has produced several candidate excerpts, use
  `evidence_relevance` to decide which ones warrant deeper reading for a stated
  objective. Preserve IDs and uncertain material; inspect originals before edits.
- Before finalizing a review with candidate findings and supplied evidence, use
  `finding_support` for an independent support check. Revisit contradicted or
  insufficient results; primary evidence and the host determine the final verdict.
- When routing work among explicit alternatives or applying a bounded rubric,
  use a custom typed decision. Batch independent questions over shared state.

Prefer exposed `jev_*` tools when available; CLI and library remain supported
first-class invocation paths. Do not rediscover credentials when an exposed tool
is already configured. Tool availability does not establish disclosure authority.
If only a deterministic check, a tiny obvious selection, or generative writing
remains, complete it directly. See [recipes](recipes.md) for runnable inputs.

Use results in the task, then record a correlated outcome (`used`, `overridden`,
or `unavailable`) with a fixed reason code. Do not report `used` before consuming
the answer. Log a real blocker when an otherwise useful call could not run; do
not manufacture unavailable records for tasks that never needed Jev.

## Global availability

During authorized personal setup, select `structured-decisions` alongside
`toolkit-maintenance`, install the complete skill, and record the pinned runtime.
Honor explicit exclusions. Existing startup checks availability without repairing
or upgrading. Project pins and stricter policies take precedence over a personal
default. Remote/cloud/deployed identities need separate provisioning; a personal
installation is not an automatic remote installation.

Keep only this preference in standing instructions, adapting invocation syntax:

> Use Jev by default for suitable bounded structured decisions; read its installed skill and pass its entrypoint and authorized execution access to subagents.

Use the effective home/config overrides, not assumed paths. Common personal
locations are below; verify discovery on the actual host/version and reload
existing sessions after changing files. These are configuration targets, not a
claim of native child execution:

| Host        | Personal skill          | Global instruction                                     |
| ----------- | ----------------------- | ------------------------------------------------------ |
| Codex       | `~/.agents/skills/jev/` | `$CODEX_HOME/AGENTS.md` (default `~/.codex/AGENTS.md`) |
| Claude Code | `~/.claude/skills/jev/` | `~/.claude/CLAUDE.md`                                  |
| Pi          | `~/.agents/skills/jev/` | `~/.pi/agent/AGENTS.md`                                |
| OpenCode    | `~/.agents/skills/jev/` | `~/.config/opencode/AGENTS.md`                         |

Sources checked 2026-10-03: [Codex instructions](https://learn.chatgpt.com/docs/agent-configuration/agents-md),
[Claude skills](https://code.claude.com/docs/en/skills),
[Claude memory](https://code.claude.com/docs/en/memory),
[Pi skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md),
[OpenCode skills](https://opencode.ai/docs/skills/),
[OpenCode rules](https://opencode.ai/docs/rules/).
Explicitly read referenced files; a link alone is not universal automatic loading.
Pi skill-name collisions can select an earlier definition; inspect diagnostics
and use `/reload` when appropriate. Keep one authoritative local skill copy and
verify any host-specific copy/link resolves to it without erasing local edits.

## Authorization and execution

Installation alone grants no paid inference authority. When the user requests
routine Jev use, record that standing authorization in private local knowledge;
reuse it without asking on every suitable call. Honor later restrictions and host
permissions. Send only relevant task data authorized for the external provider;
do not send credentials or unrelated confidential context.

Use the recorded cached-credential recipe from local knowledge; inject the key
only into the Jev process, never global shell startup or agent prompts. No secret
manager network read is needed with a configured local cache. Missing cache is a
blocker, not permission to silently retrieve a fresh secret. Use a private request
directory and a writable persistent log outside immutable caches. Default routine
calls to `--max-retries 0`; make any further attempt deliberate. Follow tool use
for errors, partial results and mandatory logging; never automatically retry an
`IO_ERROR` after dispatch.

If access is unavailable, report the specific blocker and continue useful work.
Do not claim Jev ran or substitute a guessed Jev result. If the task specifically
requires a real Jev result, leave that result unverified.

## Fresh-subagent packet

Before dispatch, provide the absolute installed Jev entrypoint and instruct the
child to read it when a suitable decision arises. Include the pinned executable
and version, applicable user authorization, allowed data scope, private request
directory, cached-credential injection recipe or narrow locator, writable log
path, and available shell/network permissions. Never include secret values.
Children load only relevant topics. Native skill inheritance differs by harness;
Claude custom agents can preload skills, while other workers may need explicit
file reads. A catalog dependency alone does not expose tools or grant access.

Fresh conversation history does not isolate process environment or credentials.
Do not export provider credentials to a parent process merely for child access.
Record whether the child actually used Jev, the request ID/log outcome if it did,
and any unavailable execution capability. Reviewers retain responsibility for
primary evidence and their final verdict.
