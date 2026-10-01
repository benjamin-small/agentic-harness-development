# Session checks and updates

At session start, check that the active toolkit runtime matches the consumer's
selected version. Checking is read-only. Updating is an explicit operation carried
out by the [update skill](../skills/update/SKILL.md), whose component-owned knowledge
and memory describe the procedure progressively.

## Version alignment

Put an exact version in the consumer project's `.poietic-harness.json`:

```json
{ "schemaVersion": 1, "version": "2026.1001.174037" }
```

Substitute the installed release's timestamp. The [pin schema](../schemas/version-pin.schema.json)
has just these two fields; record hashes, paths, and selected components separately.
The checker does not climb parent directories. Pass the actual project root.

```sh
# Use the installed binary's recorded absolute path if it is not on PATH.
poietic-harness check --project /absolute/project
poietic-harness check --project /absolute/project --latest
poietic-harness check --config /absolute/service/version-pin.json --offline
```

The same library is exported from
`@benjamin-small/agentic-harness-development/maintenance`:

```ts
import { checkVersion } from "@benjamin-small/agentic-harness-development/maintenance";
const report = await checkVersion({
  root: "/absolute/toolkit-package",
  project: "/absolute/project",
  offline: true,
});
```

An exact pin checks locally by default. `--latest` also reports whether a newer
public release exists, without changing the alignment target. Without a pin, the
default target is GitHub's latest regular release (one public unauthenticated
request, at most five seconds and 256 KiB). Offline or failed unpinned lookups are
unknown, never silently aligned. Latest discovery sends no project content or
credentials. Startup never downloads release archives or executes inference.

`--expected VERSION` selects an explicit comparison target instead of the project
file; `--config PATH` selects a user/deployment pin. They are mutually exclusive.
`--offline` and `--latest` are also mutually exclusive. Invalid present pins and
inconsistent package/lock/plugin versions fail without a remote fallback.

JSON stdout identifies `installedVersion`, `expectedVersion`, `targetSource`,
`alignment`, `relation`, `latest`, and `updateAvailable`. Exit status: **0 aligned,
1 mismatch, 2 unknown or invalid check**. Invalid checks use JSON stderr.
An older pin can be aligned while a newer release is available. A newer local
build can be ahead; the checker never downgrades it. `integrity: not-checked`
explicitly limits the result to version metadata: it does not audit dirty Git
trees, stale compiled code, or manually copied instruction files.

## Claude Code

The compiled package includes `dist/claude-plugin/poietic-harness`. From source,
run `npm ci && npm run build` first. Enable it for a session with:

```sh
claude --plugin-dir /absolute/package/dist/claude-plugin/poietic-harness
```

Keep this argument in the relevant user's or service's launch configuration for
future sessions. This release does not publish a plugin marketplace or modify
global harness settings automatically. Its exact skill command is
**`/poietic-harness:update`**. Only maintenance is registered; UI and Jev selections
remain separate. Avoid installing a second copy through portable discovery when
using this plugin.

The native SessionStart hook runs for startup, resume, clear, and fork, but skips
compaction. It reads the project pin from Claude's project root. `session-start`
produces `hookSpecificOutput.additionalContext` and always exits 0, including on
failure, so a network issue does not prevent a session. The harness timeout is ten
seconds. Pin deployments' working project directory before enabling the hook, or
invoke the standalone checker with an explicit offline config during service
startup. No plugin or model permissions are widened.

The generated adapter follows the upstream [plugin namespace](https://code.claude.com/docs/en/plugins)
and [exec-form hook contract](https://code.claude.com/docs/en/hooks). It is validated
against Claude Code 2.1.281; see [testing](testing.md) for the exact verification
boundary. Its source is `skills/update/` and the shared TypeScript maintenance
library. Do not hand-edit generated files.

## Other harnesses and persistent services

Install the canonical `skills/update/` component in the selected harness's
discovery directory. Its portable name is `update`; colons belong to the native
plugin namespace, not the Agent Skills name. A request for `poietic-harness:update`
is described in its metadata, but native slash syntax differs by harness.

Add this instruction to the consumer's existing startup guidance, substituting
recorded absolute paths:

> Once at session start, run `/absolute/runtime/node_modules/.bin/poietic-harness check --project /absolute/project`.
> Report mismatch or unavailable status and continue the task. Do not update at
> startup. Use the Poietic Harness update skill for an explicit update request,
> preserving the selected scope and local knowledge/memory.

This repository's [AGENTS.md](../AGENTS.md) uses the equivalent source command.
Cooperative instructions alone are not a native lifecycle hook for every harness.
For a long-running agent, run `check --config /absolute/pin.json --offline` during
startup and decide in its supervisor whether mismatch should fail readiness.
Keep the tool/image pinned and provisioned before startup. Durable state,
singleton leases, and background event handling belong to that service.

## Updating

An explicit skill invocation selects the scope and exact target, reads relevant
changelog/migration entries, acquires verified assets in a new cache, checks the
new runtime, merges only selected public component files, and switches the
consumer path and pin. Keep the old version for rollback. Preserve all scoped
`knowledge/local/` and `memory/local/` data and resolve edits before replacing
public files. See the [complete local procedure](../skills/update/knowledge/updating.md).

There is no automatic installer or atomic updater in this release. The skill
guides the harness through those steps and requires honest reporting of partial
work. Installing the skill alone does not install software or activate a hook.
