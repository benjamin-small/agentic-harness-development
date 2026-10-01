# Changelog

Versions identify the UTC release-preparation date and time (`YYYY.MMDD.HHMMSS`, numeric groups without leading zeros). Pin an exact release and read its changes; version numbers do not promise compatibility.

Entries follow the [changelog policy](docs/changelog.md). `Unreleased` describes changes not yet included in a published release.

## Unreleased

### Added

- **Repository maturity:** Add reusable Tinker → Alpha → Beta → Stable badges and a linked guide defining each stage, selection criteria, and README examples. Require a badge and evidence-based status explanation when bootstrapping or maintaining a project's primary README. Mark this toolkit Alpha because its core packages are tested while live provider and interactive harness verification remain pending; maturity stays independent of timestamp versions.

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
