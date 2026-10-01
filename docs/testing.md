# Testing

Run `npm run check` for formatting, TypeScript, coverage tests, and resource validation. Node.js 24 and 26 are exercised in CI on Linux and macOS. Windows-native execution is not yet verified.

## Test scope

Tests cover catalog structure/dependencies, selection, skill metadata/destinations, resource containment, local knowledge/memory indexes, and CLI output channels. Packaging tests inject synthetic private notes into isolated fixtures and verify their exclusion. Git ignore rules are checked without writing private notes into the repository.

Jev tests exercise choice/score/noul contracts, structured guidance, missing/optional metadata, partial and malformed responses, invalid UTF-8, bounded inputs/responses, credential handling, 401/402/429/5xx errors, Retry-After, deadlines, cancellation during fetch/body/backoff, bounded streaming batches, repeated IDs, source errors, output backpressure, and SIGINT/SIGTERM. Transport is injected; no API key or network is needed for the suite.

Release-version tests cover UTC conversion, whole-second precision, midnight, leap days, invalid dates/times, numeric padding, package/lockfile agreement, legacy migration, and duplicate/backward timestamp rejection. Stamping tests use temporary package fixtures and preserve dependency versions.

Maintenance tests cover pin precedence, chronological comparisons, ahead/behind
states, pinned alignment with a newer available release, local metadata conflicts,
invalid pins, offline/HTTP/network failures, bounded response bodies and deadlines,
structured CLI exits, and fail-soft startup context. The generated Claude plugin's
actual exec command is run against a temporary project pin; it includes only
maintenance, with no UI registration or inference.

Measured on 2026-10-01 with Node.js 26.10.0: **99.76% lines/statements, 100% functions, and 98.12% branches**, across 53 passing tests. Reproduce with `npm run test:coverage`; CI uploads its own per-runtime measurements. Coverage covers `src/` runtime code, not the release scripts or skill decision quality. There is no arbitrary global coverage threshold.

## Artifact verification

`npm run release:pack` followed by `npm run release:verify` validates checksums and installs the exact tarball into a fresh temporary npm consumer. It verifies catalog/library exports, shipped resource paths, selection, installed CLI execution, and version consistency. Jev verification imports the `/jev` entry, uses injected transport for a decision and partial batch, and invokes the installed `jev` binary for local validation/version. Maintenance verification imports `/maintenance`, invokes the installed version checker against a project pin, checks plugin/runtime version agreement and canonical skill copies, and runs the packaged hook command. Package installation needs access to npm for the locked direct runtime dependencies.

## Outside this baseline

The [isolated Codex dogfood runner](codex-dogfood.md) provides a separate opt-in
installation test with an empty container home and example UI project. Its
credential-free preflight and authenticated bootstrap/fresh-session run have
passed with Codex 0.156.1 and release v2026.1001.174037. Native discovery found
Jev, UI standards, and update; the fresh session executed the pinned startup
check and validated Jev locally through the CLI and library. See the
[dated evidence review](verification/codex-2026-10-01.md) for scope and limitations.
This opt-in test is not part of ordinary CI and does not establish live inference.

Claude Code 2.1.281's `plugin validate --strict --json` accepts the generated plugin
manifest without warnings. Unit and external-consumer tests execute the generated
hook command and validate its context output. These checks do not establish
interactive skill discovery, hook invocation by a running Claude session, or a
successful real user upgrade. Those remain separate verification steps; no host
global configuration is modified for these tests.

Tests do not establish skill quality or general Jev usefulness. Native specialist
adapters and skill behavior evaluations remain later milestones. The [live Jev
verification](verification/jev-2026-10-01.md) covers library and CLI requests with
choice, score, and noul questions, correlated results, and a simple consumer
decision. From source, `JEV_LIVE_SMOKE=1 npm run jev:smoke` makes up to two
synthetic requests, with no retries and a 20-second deadline per request, when
credentials are explicitly injected. It reports typed answers, model, attempts,
and usage, never credentials. These fixture expectations are not calibrated
thresholds or a decision-quality benchmark.
