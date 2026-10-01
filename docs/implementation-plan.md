# Initial implementation plan

Status: foundation implementation. Decisions established on 2026-10-01.

## Objective

Publish a reusable collection of skills, harness specialists, and TypeScript tooling. A developer or deployed agent should be able to consume a pinned release, select capabilities, and install the appropriate instructions and software into a defined scope.

## Decisions

- Agent Skills is the canonical skill format; AGENTS.md supplies repository guidance.
- A skill teaches a procedure; an agent definition selects a role, skills, and tools; an instance owns identity and state.
- Harness specialists receive fresh task context. A future project manager has persistent identity and one active coordinator per project.
- Keep durable services in a separate repository, consuming versioned definitions from this one.
- Build Jev in TypeScript as an importable library with a thin CLI. Support Pi through a native extension when implemented.
- Personal, project, and deployment installations are distinct. Catalog metadata separates instruction assets from executable dependencies.
- Native packaging is preferred over a new general-purpose package manager. Our bootstrap coordinates versions, capability selection, and verification.
- Use MIT licensing and public GitHub releases. Keep the initial package private to npm until registry publication is deliberately selected.

## M0: Repository foundation — this release

Deliver mature documentation, validated portable resources, a read-only selection planner, TypeScript checks, and release infrastructure.

Acceptance:

- [x] README, AGENTS.md, changelog, license, contribution, security, ownership, and issue/PR templates.
- [x] Document architecture, conventions, install scopes, Jev contract, and source provenance.
- [x] Seed Jev/UI skills and a UI reviewer role without pretending native wrappers exist.
- [x] Validate catalog structure, contained resource paths, skill frontmatter, and dependencies.
- [x] Resolve explicit capability selections, includes/excludes, and transitive dependencies without modifying a harness.
- [x] Verify tests, coverage, package installation, and artifact contents.
- [x] Create the public GitHub repository and enable private security reporting, secret scanning, and push protection.

The external publication gate is a successful [CI run](https://github.com/benjamin-small/agentic-harness-development/actions/workflows/ci.yml), protected main, and a verified [foundation prerelease](https://github.com/benjamin-small/agentic-harness-development/releases/tag/v0.1.0-alpha.1). Those live records identify publication status; a local commit alone does not.

## M1: Jev library and command-line tool

Implement the [Jev contract](jev-runtime.md) under a separate package boundary. Pin the initial model to `typesafe/jev-1.13`; verify the upstream schema at implementation time.

Acceptance:

- Single requests accept multiple named, independent typed questions over shared state.
- JSONL batches support separate states, bounded concurrency and input size, caller IDs, ordered/correlatable results, cancellation, and per-request errors.
- Strict input/output validation, structured errors, timeouts, and bounded retry behavior. Document possible duplicate billing after ambiguous network failures.
- The library accepts injected transport and cancellation; the CLI uses environment credentials and JSON stdout.
- Unit/contract tests cover response variants, malformed data, missing credentials, 401/429/5xx, cancellation, and partial batches.
- Publish a consumable package and CLI artifact; run one explicitly configured, bounded live request and report model/usage without logging secrets or private state.

## M2: Bootstrap and capability selection

Add deterministic project inspection and installation planning. Inputs include the explicit project manifest, detected evidence, selected harness, scope, and pinned release.

Acceptance:

- Detect actual UI evidence across web/mobile/desktop projects and scoped monorepo roots. A framework dependency alone is insufficient.
- Explicit includes/excludes override detection; report reasoning and uncertain evidence.
- User configuration contains personal defaults. Projects record capabilities and exact release integrity. Deployments require explicit pinned manifests.
- Idempotent installation owns a bounded set of files, preserves user edits, supports removal/rollback, and never silently pulls latest during runtime startup.
- Test installation twice, upgrades, conflicts, interrupted downloads, missing dependencies, corrupted assets, and offline use of verified cached content.
- Reuse native skill/package installers where suitable; verify their version and pinning behavior before delegation.

## M3: Native harness specialists

Begin with Claude Code, Codex, and Pi. Add Cursor, Copilot, OpenCode, and Gemini adapters only after targeted consumer verification.

Acceptance:

- Adapt canonical UI reviewer instructions and required skills into native formats without copying a second source of policy.
- An invocation starts with isolated context, a bounded task brief, relevant references, and a defined findings/result contract.
- Declare unsupported settings rather than silently weakening tool restrictions or claiming identical semantics across harnesses.
- Pi extension registers a Jev tool backed by the shared TypeScript library; package it using Pi conventions.
- Verify personal/project discovery and a realistic review in each supported harness. Mark documentation-only integrations separately.

## M4: Persistent agent service — separate project

Specify the contract first; do not implement a daemon in this repository. A service can host one project-manager identity per repository and delegate disposable workers.

Acceptance in the service project:

- Durable event cursor, backlog, decisions, and task records survive restarts.
- Leases with fencing, deduplicated events, and idempotent dispatch protect ownership and task creation.
- Scoped credentials, bounded retries/concurrency/cost, recovery, and operational visibility.
- Definition upgrades are explicit and reversible. Restart uses pinned definitions and reconstructs bounded context.

## Release gates and remaining choices

Every shipped artifact must pass an isolated consumer test. Real-harness and live-API validation remain separate from schema and mock tests. Native standalone binaries, npm publication, and an MCP wrapper are follow-up distribution choices, not requirements for the bootstrap release.
