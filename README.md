# Agentic Harness Development

[![Repository maturity: Alpha](docs/badges/maturity-alpha.svg)](docs/repository-maturity.md#alpha)

Portable skills, agent roles and shared harness instructions. This repository
provides versioned guidance for developer harnesses and deployed agents, with
explicit capability selection and scoped knowledge/memory.

[Implementation plan](docs/implementation-plan.md) · [Bootstrap instructions](BOOTSTRAP.md) · [Architecture](docs/architecture.md) · [Releases](https://github.com/benjamin-small/agentic-harness-development/releases)

## Instruction layer

`skills/` owns reusable procedures and expertise; `agents/` owns portable roles.
Their entrypoints stay small and load indexed knowledge and memory progressively.
The [catalog](catalog.json) records capabilities, dependencies and intended
execution scope. Selecting instructions computes a plan; it does not install
software, invoke a provider or deploy a service.

- [Jev decisions](skills/jev/SKILL.md): typed question design, bounded use and interpretation.
- [UI standards](skills/ui-standards/SKILL.md) and [UI reviewer](agents/ui-reviewer/AGENT.md): selected review criteria and a fresh review role.
- [Harness startup](skills/poietic-harness-start/SKILL.md) and [scoped updates](skills/poietic-harness-update/SKILL.md): installation checks and explicit upgrades preserving local expertise.
- [Harness compatibility reviewers](docs/harness-review.md): four independent roles used for repository changes; native registration is not automatic.

Follow the [local expertise convention](docs/local-expertise.md) and [format/compatibility conventions](docs/conventions.md).
Durable identities, queues, leases and operational state belong to a separate runtime service.

## Embedded tools

Executable implementations live under [`tools/`](tools/README.md), separately from
the portable instructions that describe their use. Each tool owns its source,
tests, build configuration, implementation manual and local expertise. The root
release composes their outputs through explicit package metadata.

[Jev](tools/jev/README.md) is the first embedded tool. Its CLI/library and launcher
are owned by `tools/jev/`; the usage skill remains `skills/jev/`. Consumers keep
the `jev`/`jev-run` commands and toolkit `/jev` export. This release embeds the component layout; an explicit installation update
includes the [wrapper migration](tools/jev/knowledge/toolkit-contract.md#wrapper-migration).

Generic catalog/planning and maintenance code remains repository infrastructure
under `src/`. Root `scripts/` owns build/release orchestration; tool-specific
implementation and verification belong to the owning component.

## Current status

**Maturity: Alpha.** Catalog/resource validation, package checks and
[isolated Codex bootstrap](docs/verification/codex-2026-10-01.md) provide evidence
for the advertised core. [Live Jev integration](docs/verification/jev-2026-10-01.md)
is a bounded fixture; broader decision quality and other native harness behavior
remain unverified. See the [maturity scale](docs/repository-maturity.md).

Releases use exact [UTC date/time versions](docs/releases.md). Read the changelog
for behavior and migration requirements; timestamps do not promise compatibility.
Catalog schema 2 requires a matching reader. Automatic project detection,
installation writes and native agent adapters remain planned.

## Development and selection

Use Node.js 24 LTS or 26. No provider key is needed for ordinary checks.

```sh
npm ci
npm run check
node dist/src/cli.js catalog
node dist/src/cli.js plan --capability ui --harness claude-code --scope project
node dist/src/maintenance/cli.js check --project .
```

The read-only planner lists selected components and destinations. The maintenance
runtime checks explicit pins and offers [cached release polling](docs/maintenance.md#fast-polling-without-inference).
Root checks compose generic harness tests and each embedded tool's tests. For
tool-only development, use its own README and commands.

## Contents

| Location                    | Owns                                                                      |
| --------------------------- | ------------------------------------------------------------------------- |
| `skills/`                   | Portable procedures, decision/usage expertise and scoped lessons          |
| `agents/`                   | Portable roles and their knowledge/memory                                 |
| `tools/`                    | Embedded executable components, each with source/tests/docs               |
| `catalog.json`, `schemas/`  | Instruction selection metadata and wire schemas                           |
| `src/`, `test/`, `scripts/` | Generic catalog/maintenance infrastructure and release composition        |
| `docs/`                     | Shared architecture, conventions, installation, tests and release process |

For pinned installation, start with [BOOTSTRAP.md](BOOTSTRAP.md). Toolkit artifacts
are distributed through GitHub releases. Credentials and private local expertise
stay outside releases; installing an instruction or tool grants no additional
external-action permission.

See [testing](docs/testing.md), [contributor guidance](CONTRIBUTING.md) and
[security reporting](SECURITY.md). MIT licensed; upstream documentation is linked
and summarized with attribution.
