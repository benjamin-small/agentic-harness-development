# Working on the embedded Jev tool

This directory owns Jev executable implementation. Keep decision/usage guidance
in `skills/jev/`; root source owns generic harness infrastructure. Read the
[toolkit contract](knowledge/toolkit-contract.md) before changing integration.

- Runtime imports stay inside this component or use Node built-ins. Keep the CLI
  and launcher thin over the library; do not import generic harness source.
- Run component build/typecheck/tests after root `npm ci`; root `npm run check`
  verifies integration, packaging and aggregate coverage.
- Preserve typed responses, credential boundaries, cancellation, pin precedence,
  scope attestations, persistent logs and non-replayable dispatched IO errors.
- `package.json` is private and toolkit-versioned. Stamp through root
  `release:stamp`, never choose an independent tool version or publish to npm.
- Own implementation knowledge/memory here; decision-design expertise stays in
  the usage skill. Keep private local directories out of Git and releases.
- Apply root changelog, maturity and fresh specialist review requirements. Do not
  create nested reviewer fan-out or run live inference as an automatic test.

Maintain learned implementation state only in a writable component working copy, separate from immutable release/runtime caches. Installing the embedded package does not provision a writable expertise root.
