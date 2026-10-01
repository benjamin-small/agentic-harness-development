# Working in this repository

This repository distributes portable skills, reusable agent roles, and TypeScript tools. Read `docs/implementation-plan.md` for the current milestone and `docs/architecture.md` before changing component boundaries.

## Commands

- `npm ci` installs the locked toolchain; use Node.js 24 LTS or 26.
- `npm run check` formats-checks, typechecks, measures test coverage, and validates catalog resources.
- `npm run release:pack` validates and assembles release assets.
- `npm run release:verify` installs the exact tarball in a temporary consumer and checks library and CLI behavior.

## Constraints

- Use TypeScript for Jev and shared runtime code. Keep CLI and adapters thin over the library.
- `skills/*/SKILL.md` is canonical skill content. Load detailed references progressively. Preserve standard frontmatter and relative links.
- `agents/*.md` contains portable role instructions. Native models, permissions, and discovery settings belong in harness adapters.
- This repository owns definitions and tools. Durable project state, event queues, leases, and deployed identities belong in a separate runtime service.
- The bootstrap CLI is read-only. Do not silently turn a selection plan into installation, a paid API call, or a background service.
- Explicit project selections override detection when detection is implemented. Installing a capability does not grant new external-action permissions.
- Never commit credentials or copy local user configuration into releases. Read `.env.example` only for variable names; it is not a credential source.
- Do not claim native compatibility, a live API check, or a published release based solely on local validation.

## Completion

Run the checks appropriate to the change. Update the implementation plan and changelog when behavior changes. Update measured coverage after changing runtime tests. For release changes, verify an external consumer of the exact artifact and confirm GitHub assets and status. Keep documentation clear about implemented versus planned behavior.
