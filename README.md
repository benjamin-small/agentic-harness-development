# Agentic Harness Development

Portable skills, harness specialists, and reusable development tools. This repository provides versioned guidance that can be consumed by a developer's coding harness or by a deployed agent.

[Implementation plan](docs/implementation-plan.md) · [Bootstrap instructions](BOOTSTRAP.md) · [Architecture](docs/architecture.md) · [Releases](https://github.com/benjamin-small/agentic-harness-development/releases)

## Current status

Releases use [UTC date-and-time versions](docs/releases.md), such as `2026.1001.171432` for 2026-10-01 at 17:14:32 UTC. Pin an exact timestamp; changes and compatibility details belong in the changelog.

The toolkit includes the Jev TypeScript library and CLI and a [shared local expertise layout](docs/local-expertise.md): every skill and agent owns indexed `knowledge/` and `memory/` directories. Search locally, load relevant material progressively, and maintain scoped lessons with evidence. Catalog schema 2 requires a matching reader; historical alpha.1 retains schema 1 and its original paths.

The toolkit includes:

- Agent Skills for Jev question design and UI standards, with progressive reference loading.
- A portable UI reviewer role intended for fresh, isolated task contexts.
- A validated capability catalog, TypeScript library, and read-only selection CLI.
- An importable Jev client and `jev` CLI for typed decisions and bounded JSONL batches through OpenRouter.
- A read-only `poietic-harness` version checker, an update skill, and a Claude Code plugin providing `/poietic-harness:update` and a SessionStart check.
- CI, contributor guidance, and GitHub release archives with checksums and a source manifest.

Automatic project detection, installation writes, and native subagent adapters remain planned. The catalog CLI produces a selection plan without changing harness configuration. A persistent project-manager service is a separate future project. Jev contract and consumer tests use synthetic fixtures; live provider verification is pending.

## Quick start

Development requires Node.js 24 LTS and npm. Node.js 26 is also tested. No API key is needed for these commands.

```sh
npm ci
npm run check
node dist/src/cli.js catalog
node dist/src/cli.js plan --capability ui --harness claude-code --scope project
node dist/src/maintenance/cli.js check --project .
```

The plan lists selected components, their dependencies, and skill destinations. Capabilities are explicit in this release. It will not infer that a project has a UI. The version check uses a project pin when present, otherwise a bounded public release lookup; see [session checks and explicit updates](docs/maintenance.md) for offline use and harness setup.

The library exports the same catalog validation and selection logic:

```ts
import {
  loadCatalog,
  planSelection,
} from "@benjamin-small/agentic-harness-development";

const catalog = await loadCatalog();
const plan = planSelection(catalog, {
  capabilities: ["ui"],
  harness: "claude-code",
  scope: "project",
});
```

For installation from a pinned GitHub release, start with [BOOTSTRAP.md](BOOTSTRAP.md). Runtime code is distributed as a tarball attached to GitHub releases; it is not published to npm yet.

## Jev decisions

Use `jev validate --input request.json` to check a request locally, then `jev decide --input request.json` to send its named questions and shared state to OpenRouter. `jev batch --input requests.jsonl --concurrency 4` streams correlated results for independent requests. In a source checkout, substitute `node dist/src/jev/cli.js` for `jev`.

The same client is available through `@benjamin-small/agentic-harness-development/jev`. See the [runtime manual](docs/jev-runtime.md) for request examples, library exports, JSON output, deadlines, retry/billing semantics, and error handling. The [Jev skill](skills/jev/SKILL.md) progressively loads guidance for designing and interpreting decisions.

## Contents

| Location                   | Purpose                                                                                 |
| -------------------------- | --------------------------------------------------------------------------------------- |
| `skills/jev/`              | When to use Jev, typed question design, OpenRouter details, and interpretation limits   |
| `skills/update/`           | Poietic Harness version checks and explicit scoped updates preserving local expertise   |
| `skills/ui-standards/`     | UI review criteria, scoped to the project's actual design system                        |
| `agents/ui-reviewer/`      | Portable role, local knowledge, and memory indexes; native harness wrappers are planned |
| `catalog.json`, `schemas/` | Repository-owned component metadata and its JSON Schema                                 |
| `src/`                     | Catalog library/planner and separate Jev library/CLI                                    |
| `docs/`                    | Plan, architecture, installation contract, tests, and release process                   |

Skills follow the [Agent Skills format](https://agentskills.io/specification). Repository instructions use [AGENTS.md](https://agents.md/). Agent metadata in this repository is a local packaging contract, not a claim of a universal agent standard. See [conventions and compatibility](docs/conventions.md).

## Configuration and validation

The catalog CLI reads only the bundled catalog and command arguments. The maintenance CLI reads installation metadata and an exact consumer pin, with optional public release lookup. The Jev CLI reads `OPENROUTER_API_KEY` from its environment; see [.env.example](.env.example). Never put credentials in a skill, project manifest, release, or command-line argument. Selecting a capability or installing a skill does not invoke inference.

See [testing](docs/testing.md) for measured coverage, tested boundaries, and checks that still require a real harness. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md); vulnerabilities can be reported privately through [SECURITY.md](SECURITY.md).

MIT licensed. Upstream documentation is linked and summarized with attribution; upstream names and services retain their respective ownership.
