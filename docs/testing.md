# Testing

Run `npm run check` for formatting, TypeScript, coverage tests, and resource validation. Node.js 24 and 26 are exercised in CI on Linux and macOS. Windows-native execution is not yet verified.

## Test scope

The tests cover catalog structure, cross-component dependencies, cycles, unknown selections, explicit exclusions, skill destination planning, metadata validation, missing resources, symlink/path escape rejection, linked reference cycles, and CLI stdout/stderr behavior. No API key or network is needed for the test suite.

Measured on 2026-10-01 with Node.js 26.10.0: **100% lines, 100% statements, 100% functions, and 97.84% branches**, across 13 tests. Reproduce with `npm run test:coverage`; CI uploads its own per-runtime measurements. Coverage covers `src/` runtime code, not the release scripts or skill decision quality. There is no arbitrary global coverage threshold in this initial baseline.

## Artifact verification

`npm run release:pack` followed by `npm run release:verify` validates checksums and installs the exact tarball into a fresh temporary npm consumer. It verifies library exports, shipped resource paths, installed CLI execution, selection output, and version consistency. Package installation needs access to npm for the locked direct runtime dependencies.

## Outside this baseline

Tests do not establish that a skill chooses good actions in every task, that a native harness discovers these assets, or that Jev returns useful live decisions. Native adapter smoke tests, skill behavior evaluations, and bounded live API checks are acceptance criteria in later milestones. The foundation release claims none of those results.
