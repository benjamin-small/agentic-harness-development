# Working in this repository

This repository distributes portable skills, reusable agent roles, and TypeScript tools. Read `docs/implementation-plan.md` for the current milestone and `docs/architecture.md` before changing component boundaries.

## Session start

Once at session start, run `node dist/src/maintenance/cli.js check --project .` from this repository root, unless the Poietic Harness plugin already supplied a check for this installation. Compare with `.poietic-harness.json` if present; otherwise check the latest public release. Report a mismatch or unavailable check briefly, then continue the user's work. If the compiled runtime is absent, report that the check needs the documented build; do not silently install dependencies just to start a session. A development checkout can be ahead of the last release. Version equality does not verify source contents or copied skills.

Never upgrade, rewrite a pin, or discard local work at startup. For an explicit update request, read `skills/update/SKILL.md` (`poietic-harness:update`; `/poietic-harness:update` in the Claude plugin). Use [the maintenance guide](docs/maintenance.md) for other consumer scopes and offline checks.

Live discovery requires HTTPS access to `api.github.com` from the actual execution context. For an authorized check blocked by the sandbox, use the host's supported permission flow when available; instructions alone do not grant access. If access remains unavailable, report it and continue. Do not reinstall, retrieve credentials, or change global network settings at startup. Inspect `latest.status` separately from local pin alignment.

## Commands

- `npm ci` installs the locked toolchain; use Node.js 24 LTS or 26.
- `npm run release:stamp` prepares a new UTC date/time version; do not choose major/minor/patch increments. See `docs/releases.md`.
- `npm run check` formats-checks, typechecks, measures test coverage, and validates catalog resources.
- `npm run release:pack` validates and assembles release assets.
- `npm run release:verify` installs the exact tarball in a temporary consumer and checks library and CLI behavior.

## Constraints

- Every project's primary README must show a linked maturity badge directly below its title, using the shared [Tinker → Alpha → Beta → Stable scale](docs/repository-maturity.md). Select the stage from evidence, explain it in the status section, and log changes to the assessment. Apply this when bootstrapping or maintaining a project within the user's requested scope.
- Use TypeScript for Jev and shared runtime code. Keep CLI and adapters thin over the library.
- `skills/<id>/SKILL.md` and `agents/<id>/AGENT.md` are canonical entrypoints. Each component must own `knowledge/INDEX.md` and `memory/INDEX.md`, with local expertise maintained under its own directories. Follow `docs/local-expertise.md`.
- Keep entrypoints and indexes small. Search the selected component with `rg`, then read only relevant topics/lessons and supporting evidence. Build useful local explanations instead of relying on remote links or previous chat context alone.
- Maintain provenance, verification dates, applicability, and index links when knowledge changes. Capture actual lessons in scoped local memory; keep `knowledge/local/` and `memory/local/` out of commits and releases. Do not modify unrelated host memory stores.
- Native models, permissions, and discovery settings belong in harness adapters. Learned state uses a writable component working directory separate from immutable release caches.
- This repository owns definitions and tools. Durable project state, event queues, leases, and deployed identities belong in a separate runtime service.
- The bootstrap CLI is read-only. Do not silently turn a selection plan into installation, a paid API call, or a background service.
- Explicit project selections override detection when detection is implemented. Installing a capability does not grant new external-action permissions.
- Never commit credentials or copy local user configuration into releases. Read `.env.example` only for variable names; it is not a credential source.
- Do not claim native compatibility, a live API check, or a published release based solely on local validation.
- Every significant addition, fix, removal, or behavior change must update `CHANGELOG.md` in the same pull request, including changes to agent/skill behavior. Follow [the changelog policy](docs/changelog.md): readable impact, searchable component names, migration actions, and clear unreleased/released status.

## Completion

Run the checks appropriate to the change. Update the implementation plan when behavior changes and apply the changelog rule above. Explain in the pull request when a minor change does not need a changelog entry. Update measured coverage after changing runtime tests. For release changes, verify an external consumer of the exact artifact and confirm GitHub assets and status. Keep documentation clear about implemented versus planned behavior.
