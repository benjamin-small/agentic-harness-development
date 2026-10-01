# Changelog

Versions use semantic versioning. Prereleases may change interfaces; pin an exact release.

## Unreleased — 0.1.0-alpha.2

### Changed

- Standardize skills and agents around component-owned `knowledge/` and `memory/` directories with small indexes, local search, progressive disclosure, and evidence-based maintenance.
- Move the UI reviewer to `agents/ui-reviewer/AGENT.md` and curated skill references into `knowledge/`.
- Catalog/selection schema 2 uses component directories for both kinds; consumers must use the matching reader and regenerate selection plans.
- Require knowledge/memory indexes during validation and exclude private `local/` material from Git and release artifacts.

The read-only CLI does not maintain memory automatically. The published alpha.1 release remains unchanged.

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
