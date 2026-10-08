# Jev direct invocation verification — 2026-10-08

Current source removes the Jev MCP server at the user's request. The CLI and
TypeScript library remain the supported invocation paths. This change is local
and unreleased; immutable published artifacts were not replaced.

## Review and implementation

Four design and four implementation specialists reviewed the removal in fresh
Codex contexts using `collaboration.spawn_agent` with `fork_turns: none`. They
shared the workspace and host tools; read-only behavior was instructed, not
technically isolated. All four implementation reviews found no blocking issues.
Codex and Claude identified a minor README punctuation issue, which was fixed.
Jev was not needed for these deterministic checks; no inference was performed.

Design requirements incorporated: preserve unrelated harness integrations and
Claude maintenance; refresh the complete Jev skill; distinguish saved removal
from existing-session tool state; retain historical log compatibility; clean
compiled output and verify the exact new package. The implementation reviews
covered tracked diff SHA-256
`d7e3e7c9b9dde02bb1294c6ca413ec276f689ed33ec6b95d8f61e667982a80f1`
before the editorial correction and this report, plus the new scripts:

- `clean-build.mjs`: `43e96b8dd7177828d0abb8903bbaa1585b1626c89a2fe789714d52a0c94b1392`.
- `verify-jev-recipes.mjs`: `2c7001d2afb9e0f82debeb29e078b9adf33bfa880b15d7f9216b61824e5f2955`.

## Validation

- `npm run check`: 77 passing tests, formatting and typechecking passed, nine
  catalog components validated. Coverage: 99.83% lines/statements, 98.21%
  branches, 100% functions. Removed server tests account for the lower test count.
- A package dry-run rejects compiled MCP modules, the former executable and SDK
  dependency while requiring the CLI and recipes. Builds now clean `dist` first.
- A newly packed local artifact installed in a fresh temporary consumer with
  lifecycle scripts disabled. Mocked library and CLI finding-support requests
  and correlated outcome recording passed. No provider traffic occurred.
- The temporary artifact retains the source package's current version string;
  it is a local candidate, not a replacement for the published release.

## Personal installation

Removed only the Jev server and its environment section from the effective Codex
configuration. Refreshed complete Jev guidance, verified private expertise was
preserved, then recorded the explicit no-MCP preference in scoped private
knowledge. Claude's skill symlink resolves to this same copy. The cached key,
persistent logs, global defaults, runtime pin and unrelated integrations remain.
Backups and provenance are recorded in the private installation record.

A fresh Codex app-server discovery returned no Jev server. The Jev skill remained
enabled with no discovery errors. Existing chats can retain previously exposed
tools until restart; they must not invoke them. Published caches may still contain
unused historical adapter files. No native Claude, Pi or OpenCode execution was
claimed or tested by this removal.
