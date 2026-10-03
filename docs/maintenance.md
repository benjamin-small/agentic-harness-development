# Session checks and updates

At session start, check that the active toolkit runtime matches the consumer's
selected version. Alignment checks are read-only; optional polling caches contain
only disposable public release metadata. Updating is an explicit operation carried
out by the [update skill](../skills/poietic-harness-update/SKILL.md), whose component-owned knowledge
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

## Fast polling without inference

**Released in v2026.1002.2233:** `poll` is available in the installed runtime. The
published v2026.1001.190334 runtime supports `check`; acquire a release containing
`poll` before using it from a pinned installation. Do not rewrite an existing pin
or modify an immutable installed runtime to pick up this command.

Run `poietic-harness poll` directly from a scheduler, supervisor, or shell. It is
a one-shot deterministic Node.js program: no model, skill evaluation, API key, or
agent session is needed. It validates the runtime and exact pin on every run,
then checks whether a newer regular GitHub release exists.

```sh
poietic-harness poll --config /absolute/user/version-pin.json \
  --cache /absolute/writable/poietic-harness/latest-release.json
```

From source, substitute `node /absolute/toolkit/dist/src/maintenance/cli.js` for
`poietic-harness`. The library exports `pollVersion` alongside `checkVersion`:

```ts
import { pollVersion } from "@benjamin-small/agentic-harness-development/maintenance";
const report = await pollVersion({
  root: "/absolute/toolkit-package",
  config: "/absolute/user/version-pin.json",
  cache: "/absolute/writable/poietic-harness/latest-release.json",
  maxAgeMs: 300_000,
  timeoutMs: 1_500,
});
```

Fresh successful lookups are reused for five minutes by default, avoiding network
latency on repeated runs. Expired entries use GitHub's ETag for conditional
revalidation when available. A network lookup makes one unauthenticated request
with a 1.5-second total request/body deadline and the same 256 KiB response limit
as `check`. `--max-age SECONDS` adjusts freshness; `0` forces revalidation.
`--timeout-ms MILLISECONDS` accepts 1 through 5000. No immediate retries occur.
These limits bound the network operation, not process startup or local disk I/O.

`--cache PATH` is optional and must name a dedicated disposable file outside the
immutable runtime, separate from pins and installation records. Without it every
online run queries GitHub. Cache writes use an atomic replacement; a failed write
is reported without hiding a valid network result. A missing, corrupt, oversized,
foreign, or future-dated cache triggers a fresh lookup. Failed refreshes never
reuse stale data as current. `--offline` permits only a still-fresh cached result;
without one, availability is unknown. `--latest` is unnecessary and rejected for
`poll`, which always checks release availability.

JSON includes all `VersionReport` fields plus `polling.source` (`cache`, `network`,
or `none`), `polling.checkedAt` (lookup start time, UTC, or null), and
`polling.cache` (`hit`, `written`, `disabled`, `write-failed`, or `miss`).
The timestamp exposes the age of reused information.

| Exit | `poll` meaning                        | `check` meaning                       |
| ---- | ------------------------------------- | ------------------------------------- |
| 0    | No newer release found                | Installed version matches target      |
| 1    | A newer release is available          | Installed version differs from target |
| 2    | Availability unknown or invalid input | Alignment unknown or invalid input    |

Polling exits describe **release availability**, independently of pin alignment.
An aligned old pin can yield exit 1; a development build ahead of latest yields
exit 0. Inspect `alignment` separately if a supervisor gates readiness on pins.
Invalid input uses sanitized JSON stderr; unavailable lookups use JSON stdout.

An existing OS scheduler can invoke this command every five minutes and branch
on its exit code without invoking inference. Choose the executable, pin, writable
cache path, network policy, and notification policy in that scheduler's setup.
Capture exit 1 as an update signal, not a crashed job. The command emits a report
on every run; notification deduplication belongs to the scheduler. This package
does not install a scheduler, daemon, or Codex automation. Concurrent cache
writes are atomic, but concurrent cold polls are not coalesced; run one scheduled
poll per shared cache. Public requests, including conditional ones, remain
subject to GitHub's unauthenticated limits; the cache reduces request frequency.
See [GitHub's conditional-request guidance](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests-if-appropriate).

See the [portable startup contract](../skills/poietic-harness-start/knowledge/host-access.md) for the shared provisioning checklist, host adapter boundaries, cached invocation, and verification procedure.

## Network permissions at installation and startup

Live version discovery needs outbound HTTPS (port 443), DNS, and TLS trust for
`api.github.com`, specifically the fixed
`/repos/benjamin-small/agentic-harness-development/releases/latest` endpoint.
Requests send no project content, authorization header, or credentials and do not
follow redirects. Installation downloads require their own separately authorized
GitHub asset and dependency access; this single-host requirement covers checking.

During installation, verify the recorded checker from the actual hook or
scheduler execution context using `check --config /absolute/pin.json --latest`
(or `poll --max-age 0` when supported). Inspect `latest.status`, not just exit 0:
`check` may align with a local pin while GitHub is unavailable. Record the command,
execution identity, network permission mechanism, and result in the installation
record. Testing from an unrestricted terminal alone does not verify a sandboxed
startup hook. A model-free scheduled poll needs its execution identity's access
configured beforehand; a prompt asking an agent to run the checker still starts
an agent turn.

Package instructions and `AGENTS.md` cannot grant network access. The host's
sandbox, approval flow, firewall, or administrator policy controls it. In Codex,
use the supported permission/approval flow for a blocked read-only check; where
the host supports domain restrictions, scope access to `api.github.com`. Do not
silently broaden global network permissions or change user configuration at
startup. See [Codex sandbox and approval boundaries](https://learn.chatgpt.com/docs/sandboxing)
(verified 2026-10-01).

At startup, reuse the recorded command and permission setup. If a sandbox blocks
an authorized lookup and the host permits approval, request the narrow permission
through that flow. If it cannot be granted, report availability as unknown and
continue useful work; local pin alignment still works offline. Do not rerun
installation, retrieve credentials, repeatedly retry, or claim GitHub itself is
down from a generic lookup failure. DNS, TLS, timeouts, HTTP/rate limits, invalid
metadata, and sandbox restrictions can all make a lookup unavailable.

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
boundary. Its source is `skills/poietic-harness-update/` and the shared TypeScript maintenance
library. Do not hand-edit generated files.

## Other harnesses and persistent services

Install the canonical `skills/poietic-harness-update/` component in the selected harness's
discovery directory. Its portable name is `poietic-harness-update`; colons belong to the native
plugin namespace, not the Agent Skills name. A request for `poietic-harness:update`
is described in its metadata, but native slash syntax differs by harness.

Install the complete [poietic-harness-start skill](../skills/poietic-harness-start/SKILL.md)
before adding this single line to the consumer's startup guidance:

> At session start, run $poietic-harness-start. Initial user-scope setup is authorized.

The skill loads routine checking or first-time setup guidance only when needed.
It preserves existing pins and reuses recorded runtime paths. Omit the second
sentence if initial setup requires separate authorization in that environment.
This repository's [AGENTS.md](../AGENTS.md) also delegates startup to the skill.

The startup skill is included starting in **v2026.1002.125921**. Releases through v2026.1002.2233
contain only the update skill. For those versions, retain existing startup
instructions unless explicitly installing this source skill and recording its
separate provenance; never point AGENTS.md at an unavailable skill.

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
public files. See the [complete local procedure](../skills/poietic-harness-update/knowledge/updating.md).

There is no automatic installer or atomic updater in this release. The skill
guides the harness through those steps and requires honest reporting of partial
work. Installing the skill alone does not install software or activate a hook.
