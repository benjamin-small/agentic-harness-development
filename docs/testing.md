# Testing

Run `npm run check` for formatting, TypeScript, coverage tests, and resource validation. Node.js 24 and 26 are exercised in CI on Linux and macOS. Windows-native execution is not yet verified.

## Test scope

Tests cover catalog structure/dependencies, selection, skill metadata/destinations, resource containment, local knowledge/memory indexes, and CLI output channels. Packaging tests inject synthetic private notes into isolated fixtures and verify their exclusion. Git ignore rules are checked without writing private notes into the repository.

Jev tests exercise choice/score/noul contracts, structured guidance, missing/optional metadata, partial and malformed responses, invalid UTF-8, bounded inputs/responses, credential handling, 401/402/429/5xx errors, Retry-After, deadlines, cancellation during fetch/body/backoff, bounded streaming batches, repeated IDs, source errors, output backpressure, and SIGINT/SIGTERM. Transport is injected; no API key or network is needed for the suite.

Release-version tests cover UTC conversion, whole-second precision, midnight, leap days, invalid dates/times, numeric padding, package/lockfile agreement, legacy migration, and duplicate/backward timestamp rejection. Stamping tests use temporary package fixtures and preserve dependency versions.

Measured on 2026-10-01 with Node.js 26.10.0: **99.71% lines/statements, 100% functions, and 98.36% branches**, across 44 passing tests. Reproduce with `npm run test:coverage`; CI uploads its own per-runtime measurements. Coverage covers `src/` runtime code, not the release scripts or skill decision quality. There is no arbitrary global coverage threshold.

## Artifact verification

`npm run release:pack` followed by `npm run release:verify` validates checksums and installs the exact tarball into a fresh temporary npm consumer. It verifies catalog/library exports, shipped resource paths, selection, installed CLI execution, and version consistency. Jev verification imports the `/jev` entry, uses injected transport for a decision and partial batch, and invokes the installed `jev` binary for local validation/version. Package installation needs access to npm for the locked direct runtime dependencies.

## Outside this baseline

Tests do not establish skill quality, native harness discovery, or live Jev usefulness. Native adapter smoke tests and skill behavior evaluations remain later milestones. A live provider check is still pending: no key was available during implementation. From a source checkout, `JEV_LIVE_SMOKE=1 npm run jev:smoke` makes at most one synthetic request with no retries and a 20-second deadline when credentials are explicitly injected. It reports model/usage without secrets or input. That bounded integration check would still not prove decision quality across tasks.
