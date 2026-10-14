# Jev embedded tool

[![Repository maturity: Alpha](../../docs/badges/maturity-alpha.svg)](../../docs/repository-maturity.md#alpha)

The TypeScript Jev client, CLI and scoped launcher are implemented here. Portable
question-design and usage instructions are owned by the [Jev skill](../../skills/jev/SKILL.md).
This component is embedded in the toolkit release; it is not published separately.

## Status

**Maturity: Alpha.** Typed contracts, logging, retries, cancellation and CLI/library
consumer behavior have automated coverage. Existing [live integration evidence](../../docs/verification/jev-2026-10-01.md)
is a bounded fixture, not a general decision-quality claim. The new component
layout is unreleased and needs the same release consumer gate as the toolkit.

## Development

Run `npm ci` at the repository root for the locked development toolchain. Then
build/typecheck/test this component independently from that root:

```sh
npm --prefix tools/jev run build
npm --prefix tools/jev run typecheck
npm --prefix tools/jev test
node tools/jev/dist/src/cli.js --version
```

The component uses Node built-ins at runtime. Its compiler includes only its own
`src/` and `test/`, using the shared repository compiler settings. Root `npm run
check` composes generic harness checks with this tool's suite and coverage.

## Interface and contents

Consumers keep `jev`, `jev-run` and the toolkit's `/jev` library export. The toolkit
manifest points these interfaces to `tools/jev/dist/src/`; its timestamp version
and this component's private manifest must agree. `release:stamp` updates both.

| Path                    | Owns                                                                  |
| ----------------------- | --------------------------------------------------------------------- |
| `src/`                  | Client, typed contracts, library, CLI and toolkit launcher            |
| `test/`                 | Runtime tests and synthetic fixtures                                  |
| `scripts/`              | Tool build cleanup, launcher installer, smoke and recipe verification |
| `docs/runtime.md`       | Runtime API and operational manual                                    |
| `knowledge/`, `memory/` | Implementation expertise and observed lessons                         |
| `.env.example`          | Environment variable names; never loaded automatically                |

Read the [runtime manual](docs/runtime.md) and [toolkit contract](knowledge/toolkit-contract.md)
for invocation and migration. Keep credentials, requests, logs and private
expertise outside release outputs. Installing/building/testing does not authorize
inference; live smoke requires explicit authorization and credential injection.
