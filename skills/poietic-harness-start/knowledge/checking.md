# Routine startup checks

Check each active runtime/pin pair once, including checks already supplied by a
native hook or earlier invocation. Do not load bootstrap instructions on this path.

## Personal installation

Read `${CODEX_HOME:-~/.codex}/poietic-harness/.poietic-harness.json`. Use targeted
search in the adjacent `INSTALLATION.md` to locate the recorded executable;
there is no need to load the full installation history. Invoke that executable:

```sh
/recorded/runtime/node_modules/.bin/poietic-harness check --config /absolute/user/.poietic-harness.json --latest
```

The default personal cache is `~/.local/share/agentic-harness-development/<version>/runtime`.
An existing pin with a missing runtime is a broken installation: report it rather
than reinstalling, selecting a different executable, or changing the pin silently.

## Project or source checkout

Honor the project's selected runtime and root `.poietic-harness.json`; run its
recorded checker with `check --project /absolute/project`. Pinned project checks
stay local unless the project asks for latest discovery.

In this toolkit's own development checkout, use
`node dist/src/maintenance/cli.js check --project .` from its root. If the build
is absent, report that limitation; do not install dependencies just for startup.
Do not treat a development checkout as the personal runtime or downgrade it when
its version is ahead of the published release.

## Interpret and continue

Inspect `alignment`, `latest.status`, and `updateAvailable` independently: an
aligned pin can have an unavailable lookup or a newer release. Version equality
is not an integrity check. Online discovery needs HTTPS to `api.github.com`;
use the host's supported permission flow if an authorized lookup is sandbox-blocked.
If unavailable, report it and continue. Do not retrieve credentials, change global
network policy, upgrade, or rewrite pins. Explicit upgrades belong to the `update`
skill (`poietic-harness:update`).

For repeated background polling, use the installed deterministic `poll` command
when available; do not schedule agent turns or create a scheduler at startup.
