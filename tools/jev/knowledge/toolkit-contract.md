# Embedded toolkit contract

Applicability: toolkit source and future releases using `tools/jev/`. Reviewed
2026-10-13 against the implementation and [release contract](../../../docs/releases.md).

The root toolkit manifest declares embedded tool directories. Each tool owns a
private manifest with the same timestamp version. Generic release stamping reads
and validates all declarations before modifying version files; packing rejects
version drift. This component compiles its own source/tests to `dist/` and never
imports the generic catalog or maintenance source.

`src/toolkit-version.ts` implements the toolkit's stable schema-1 pin and UTC
timestamp wire contract locally for launcher integration. Conformance tests compare
it with maintenance validation, including malformed dates and unknown pin fields.
Change both consumers deliberately when changing that contract; do not infer
compatibility from timestamp ordering alone.

The root package exposes `jev`, `jev-run` and `/jev` through this component's
compiled output. A configured launcher selects a toolkit cache by explicit,
project or personal pin, then reads the selected root package's `bin.jev` path.
That target must be relative, contained lexically and by realpath, and a regular
file. Root package identity/version checks and existing credential/log safeguards
remain applicable. Metadata is a trusted operator input, not a sandbox for an
untrusted repository.

## Wrapper migration

Existing released wrappers hardcode `dist/src/jev/cli.js`; they cannot invoke a
new embedded-layout runtime. During an explicit update, stage this release's
`tools/jev/dist/src/runner-cli.js` and use `scripts/install-launcher.mjs` to create
a replacement launcher. Back up and deliberately replace the old launcher;
preserve path-only configuration, credentials, log paths, scopes, pins and local
expertise. The updated wrapper can select older toolkit releases because it reads
their declared binary path. Old retained artifacts and pins stay untouched.

The nested package is embedded, not independently published or installed through
an npm workspace/file dependency. Runtime code uses Node built-ins; developer
commands use the root's locked TypeScript toolchain. Tool tests, source caches,
private local expertise and request/log files are excluded from npm artifacts.

Maintain learned implementation state only in a writable component working copy, separate from immutable release/runtime caches. Installing the embedded package does not provision a writable expertise root.
