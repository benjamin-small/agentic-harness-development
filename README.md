# Agentic Harness Development

Portable skills, harness specialists, and reusable development tools. This repository provides versioned guidance that can be consumed by a developer's coding harness or by a deployed agent.

[Implementation plan](docs/implementation-plan.md) · [Bootstrap instructions](BOOTSTRAP.md) · [Architecture](docs/architecture.md) · [Releases](https://github.com/benjamin-small/agentic-harness-development/releases)

## Current status

The first release, **0.1.0-alpha.1**, is a foundation release. It includes:

- Agent Skills for Jev question design and UI standards, with progressive reference loading.
- A portable UI reviewer role intended for fresh, isolated task contexts.
- A validated capability catalog, TypeScript library, and read-only selection CLI.
- CI, contributor guidance, and GitHub release archives with checksums and a source manifest.

**It does not yet include the Jev API client, automatic project detection, an installer, or native subagent adapters.** The catalog CLI produces a selection plan; it does not change harness configuration. A persistent project-manager service is a separate future project.

## Quick start

Development requires Node.js 24 LTS and npm. Node.js 26 is also tested. No API key is needed for these commands.

```sh
npm ci
npm run check
node dist/src/cli.js catalog
node dist/src/cli.js plan --capability ui --harness claude-code --scope project
```

The plan lists selected components, their dependencies, and skill destinations. Capabilities are explicit in this release. It will not infer that a project has a UI.

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

## Contents

| Location                   | Purpose                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------- |
| `skills/jev/`              | When to use Jev, typed question design, OpenRouter details, and interpretation limits |
| `skills/ui-standards/`     | UI review criteria, scoped to the project's actual design system                      |
| `agents/ui-reviewer.md`    | Portable role instructions; native harness wrappers are planned                       |
| `catalog.json`, `schemas/` | Repository-owned component metadata and its JSON Schema                               |
| `src/`                     | Catalog library and read-only CLI                                                     |
| `docs/`                    | Plan, architecture, installation contract, tests, and release process                 |

Skills follow the [Agent Skills format](https://agentskills.io/specification). Repository instructions use [AGENTS.md](https://agents.md/). Agent metadata in this repository is a local packaging contract, not a claim of a universal agent standard. See [conventions and compatibility](docs/conventions.md).

## Configuration and validation

The bootstrap CLI reads only the bundled catalog and command arguments. `OPENROUTER_API_KEY` is reserved for the planned Jev runtime; see [.env.example](.env.example). Never put credentials in a skill, project manifest, release, or command-line argument.

See [testing](docs/testing.md) for measured coverage, tested boundaries, and checks that still require a real harness. Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md); vulnerabilities can be reported privately through [SECURITY.md](SECURITY.md).

MIT licensed. Upstream documentation is linked and summarized with attribution; upstream names and services retain their respective ownership.
