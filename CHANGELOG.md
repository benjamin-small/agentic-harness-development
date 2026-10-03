# Changelog

Versions identify the UTC release-preparation date and time (`YYYY.MMDD.HHMMSS`, numeric groups without leading zeros). Pin an exact release and read its changes; version numbers do not promise compatibility.

Entries follow the [changelog policy](docs/changelog.md). `Unreleased` describes changes not yet included in a published release.

## Unreleased

## 2026.1003.200942 — 2026-10-03 20:09:42 UTC

### Added

- **Jev recipes and native tools:** Add executable `evidence_relevance` and `finding_support` recipes through the existing library, CLI, and opt-in `jev-mcp` stdio adapter. Native discovery exposes bounded decisions, batches, offline status and feedback; provider/credentials remain host-controlled. Recipes/MCP default to zero retries. Existing `decide` and `batch` behavior remains compatible; install a runtime containing these additions before selecting the new commands, and explicitly register/reload native tools.
- **Jev adoption evaluation:** Add opt-in fresh Codex tasks that test implicit tool selection, actual dispatch and correlated result use with a synthetic mock provider, plus arithmetic/prose negative cases. Existing offline bootstrap tests remain unchanged. This does not establish provider accuracy, native compatibility in other harnesses, or compaction speed gains.

- **Harness adversarial reviewers:** Add opt-in Claude Code, Codex, Pi and OpenCode roles with separate indexed expertise. This repository requires fresh-context design and implementation review for substantive changes, with bounded proposal packets, evidence-based findings and parent reconciliation. Explicitly distinguish role loading from native registration and fresh history from execution isolation. Missing native delegation is reported, not simulated; consumer repositories do not inherit this development gate.

### Fixed

- **Maintenance lockfile checks:** Allow bounded npm lockfiles up to 4 MiB while keeping small metadata/pin limits unchanged. The added MCP SDK dependency graph exceeded the former 64 KiB limit and otherwise caused a valid source installation to fail startup checks.

### Changed

- **Jev usefulness and review workflow:** Return persistent `callId` values, log allowlisted recipe/version/surface metadata, and accept caller-reported used/overridden/unavailable outcomes without request contents. Add concrete default-use triggers and include Jev access and outcome reporting in UI and harness review contracts. UI reviewer selection now also requires Jev; existing users should refresh the complete skill and preserve private expertise. Feedback is not an accuracy score.

- **Default Jev access:** Prefer Jev for suitable bounded decisions across tasks and fresh specialist reviews. Personal setup includes Jev by default; reviewer selection now brings its skill/runtime dependency. Dispatch carries explicit execution scope without secrets; unavailable inference does not block evidence-based review. Existing users should refresh skill guidance and add the short global preference, preserving pins and local expertise. Host permissions and explicit exclusions still apply.

- **Breaking — portable update skill:** Rename the portable component from `update` to `poietic-harness-update`, including Codex discovery and catalog dependencies. The generated Claude adapter preserves `/poietic-harness:update` by translating its entrypoint name. Migrate existing portable directories and installation records while preserving private knowledge/memory; verify the new name before retiring the old copy. Runtime pins are unaffected.

## 2026.1003.142920 — 2026-10-03 14:29:20 UTC

### Added

- **Portable startup provisioning:** Define shared read/execute, cache-write and GitHub access requirements for human harnesses and service agents. Record host-specific commands and grants once in private local knowledge, verify cold and cached calls in the actual execution context, and distinguish verified Codex support from unimplemented native adapters. No automatic upgrades or universal permission syntax are implied.

- **Codex startup checks:** Add a no-argument helper that resolves the standard personal pin/runtime and invokes bounded deterministic polling with a five-minute cache. Document a narrow command-specific permission rule and local invocation record so startup avoids repeated shell assembly and approval prompts after Codex reloads its rules. Reject alternate arguments and mismatched runtime metadata. This checks availability only; installs and upgrades remain explicit.

## 2026.1002.125921 — 2026-10-02 12:59:21 UTC

### Fixed

- **Jev signal tests:** Wait for the CLI startup event before sending SIGINT/SIGTERM, avoiding a fixed-delay race on slower CI runners while still verifying cancellation and conventional exit codes.

- **Jev credential reuse:** Record an authorized credential connection in the installed skill's private local knowledge during setup and consult it before rediscovering projects or authentication. Keep provider identifiers and an injection recipe in knowledge; support explicitly requested offline credential caching in a separate owner-only file or OS credential store, with explicit refresh and no silent network fallback. Existing installations can add the local record without changing their runtime pin.

### Added

- **Startup skill:** Add `poietic-harness-start` to the maintenance capability. A short AGENTS.md invocation loads routine checks or initial setup guidance on demand, keeping detailed procedures out of every prompt. Install the complete skill and verify discovery before shortening existing startup instructions. Older releases do not contain it; record separate provenance for a source installation. Existing runtime pins, explicit-update requirements, and private component expertise are preserved.

## 2026.1002.2233 — 2026-10-02 00:22:33 UTC

### Fixed

- **Jev deadline tests:** Use controlled timers after transport/body admission so persistent log writes on busy macOS runners cannot expire a 20 ms test deadline before the intended phase. Keep assertions for pre-dispatch cancellation, active fetch cancellation, stalled body reads, and retry backoff; runtime deadlines and logging remain unchanged.
- **Jev batch tests:** Coordinate transport starts and completions explicitly so concurrency and out-of-order assertions remain valid when log-write latency varies. Runtime admission limits and completion ordering are unchanged.

### Added

- **Maintenance polling:** Add `poietic-harness poll` and `pollVersion` for direct execution by schedulers without inference. Optional five-minute caching avoids repeated network calls; expired entries use ETag revalidation with a default 1.5-second deadline. Poll exit codes distinguish no newer release (0), update available (1), and unavailable/invalid (2), independently of pin alignment. Failed refreshes never present stale data as current. Existing `check` and `session-start` behavior is preserved. Acquire a release containing this command before using it from a pinned runtime; use a dedicated writable cache outside the installation.

### Changed

- **Jev call logging:** Persist every shared-client library/CLI call and retry to `~/.local/state/poietic-harness/jev/calls.jsonl`, with generated call IDs, timestamps, process IDs, durations, outcomes, attempt counts, and reported token/cost usage. Configure an absolute path with `JEV_LOG_PATH` or client `logPath`; `jevLogPath()` exposes the resolved path. Records append locally and omit credentials and request contents. Failed log writes return non-retryable `IO_ERROR`; provision a writable path, and do not repeat a dispatched request automatically after a logging error. CLI `decide` and `batch` additionally emit JSONL activity on stderr. `--quiet` suppresses terminal activity only; persistent logging stays enabled. Stdout remains JSON/JSONL. Stderr consumers must distinguish `event` records from `error` diagnostics.

- **Bootstrap and update guidance:** Verify public GitHub connectivity from the actual hook/scheduler context and record the host's network permission setup. Package instructions cannot grant sandbox access. Route authorized blocked checks through the host permission flow, report unresolved availability honestly, and continue without changing pins or global permissions. Routine polling runs the executable directly; it does not require skill evaluation or an agent turn.

## 2026.1001.190334 — 2026-10-01 19:03:34 UTC

### Added

- **Jev live verification:** Exercise real OpenRouter library and CLI inference with three independent typed questions, correlated JSON answers, and programmatic consumption. Expand the opt-in smoke test to at most two requests per run, with retries disabled and 20-second deadlines. The [dated evidence](docs/verification/jev-2026-10-01.md) covers one synthetic fixture, not general decision quality.
- **Codex bootstrap evaluation:** Add an opt-in disposable-container runner with a blank configuration, example UI project, native before/after skill discovery, and a fresh-session probe. Verified public-release acquisition, project-scoped Jev/UI/update discovery, startup version alignment, and local Jev CLI/library validation with Codex 0.156.1. Jev must be explicitly selected for this fixture; a UI-only plan does not install it. See the [evidence review](docs/verification/codex-2026-10-01.md). No live inference, automatic installer, or native specialist registration is claimed.
- **Repository maturity:** Add reusable Tinker → Alpha → Beta → Stable badges and a linked guide defining each stage, selection criteria, and README examples. Require a badge and evidence-based status explanation when bootstrapping or maintaining a project's primary README. Keep this toolkit Alpha: bounded Codex and Jev checks now pass, while broader harness coverage and decision quality remain unverified. Maturity stays independent of timestamp versions.

### Fixed

- **Jev response validation:** Accept OpenRouter's documented resolved model `typesafe/jev-1.13-20260917` as well as the request alias, preserving the actual returned ID. Earlier runtimes reject these valid live responses with `INVALID_RESPONSE`. Upgrade the runtime and project pin together; copying skill text alone is insufficient. Unrelated models, unknown revisions, malformed answers, and invalid usage still fail closed. Export `JEV_MODEL_REVISION` for consumers that inspect the accepted revision.
- **Jev memory guidance:** Correct the outdated statement that the runtime was unimplemented. The library/CLI are implemented and now have bounded live evidence. Add an indexed model-resolution lesson and refresh integration guidance; v2026.1001.174037 retains the old text.

## 2026.1001.174037 — 2026-10-01 17:40:37 UTC

### Added

- **Session version alignment:** Add the read-only `poietic-harness check` CLI and `/maintenance` library export. Compare the active runtime with an exact project/user/deployment pin, or a bounded latest-release lookup when unpinned; report mismatch, availability, and unknown states separately. Pinned startup checks stay offline by default and never update automatically.
- **Poietic Harness update skill:** Add component-owned indexed knowledge and memory for explicit scoped upgrades, verified acquisition, local expertise preservation, and rollback. The generated Claude Code plugin provides `/poietic-harness:update` and a SessionStart hook. Activate it with the documented `--plugin-dir` launch argument; other harnesses use the portable skill and startup guidance. Plugin manifest validation and direct hook execution are checked; interactive discovery and a real user upgrade are not yet verified.
- **Contribution guidance:** Require significant additions, fixes, removals, and behavior changes to be logged in the same pull request. Stable Markdown categories, searchable component names, impact explanations, and migration instructions make the changelog useful to humans and harnesses; see the [policy](docs/changelog.md).

## 2026.1001.171432 — 2026-10-01 17:14:32 UTC

### Changed

- Replace semantic release numbering with UTC timestamp versions and exact timestamp tags.
- Add `release:stamp` to synchronize package/lockfile versions; validate real calendar dates, time ranges, and monotonic preparation times.
- Include the full ISO timestamp in manifests and verify package/lockfile/tag agreement before packaging.
- Publish timestamp releases without alpha/beta suffixes; retain the two historical prereleases unchanged.

Jev behavior, catalog schema 2, and the pending live API check are unchanged.

## 0.1.0-alpha.2 — 2026-10-01

### Added

- Jev TypeScript library export and CLI with choice, score, and noul decisions pinned to `typesafe/jev-1.13` through OpenRouter.
- JSONL batches, bounded concurrency/input/output, sequence correlation, cancellation, request deadlines, sanitized errors, and bounded retries with explicit transport-replay opt-in.
- Local request validation, injected transport, environment credentials, and progressive tool-use guidance.
- Contract/fault/CLI tests, installed-consumer verification, and an opt-in one-attempt live smoke script.

### Changed

- Standardize skills and agents around component-owned `knowledge/` and `memory/` directories with small indexes, local search, progressive disclosure, and evidence-based maintenance.
- Move the UI reviewer to `agents/ui-reviewer/AGENT.md` and curated skill references into `knowledge/`.
- Catalog/selection schema 2 uses component directories for both kinds; consumers must use the matching reader and regenerate selection plans.
- Require knowledge/memory indexes during validation and exclude private `local/` material from Git and release artifacts.

The catalog declares bundled `jev-runtime` software separately from instructions. The planner remains read-only and does not maintain memory automatically. Live provider verification is pending; no key was available. Alpha.1 remains unchanged.

## 0.1.0-alpha.1 — 2026-10-01

### Added

- Implementation plan and architecture separating skills, agent definitions, and persistent instances.
- Jev and UI standards skills with focused, attributed references; a portable UI reviewer role.
- Component catalog, JSON Schema, and TypeScript catalog/selection library with a read-only CLI.
- User, project, and deployment installation guidance with explicit capability selection.
- Automated tests, CI, CodeQL, ownership, contribution and security guidance.
- GitHub release packaging, source manifests, SHA-256 checksums, and isolated consumer verification.

### Scope

The Jev API client, automatic capability detection, installation writes, and native agent adapters remain planned. No live inference or persistent agent service is included.
