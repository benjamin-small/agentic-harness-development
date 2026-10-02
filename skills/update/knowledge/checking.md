# Checking versions

Applicability: the maintenance runtime introduced in the first release containing
this skill. Verified 2026-10-01; canonical implementation: `src/maintenance/`.

Find the runtime through the consumer's recorded install path, not an unrelated
global executable. From an installed package, use its sibling
`node_modules/.bin/poietic-harness`. From a built source checkout use
`node /absolute/toolkit/dist/src/maintenance/cli.js`. Inside the standalone Claude
plugin use `node /absolute/plugin/runtime/cli.js --help`; commands must additionally
pass `--root /absolute/plugin` because that bundle has a different layout.

```sh
poietic-harness check --project /absolute/project
poietic-harness check --config /absolute/deployment/version-pin.json --offline
poietic-harness check --project /absolute/project --latest
```

The project root's `.poietic-harness.json` contains only:

```json
{ "schemaVersion": 1, "version": "2026.1001.174037" }
```

Use the actual selected timestamp. This is a version pin, not an installation
inventory, capability manifest, or artifact-integrity lock. Keep artifact hashes
and installation paths in the consumer's provisioning record.

`--expected VERSION` overrides the project pin for a deliberate comparison;
`--config PATH` selects an explicit user/deployment pin. These two flags are
mutually exclusive. No ancestor-directory search or global fallback occurs: pass
the correct project root, especially in monorepos. An invalid present pin fails
instead of falling back to latest.

With a pin, startup stays offline unless `--latest` is explicitly requested.
Without a pin, it queries the fixed public GitHub latest-release endpoint once,
with a five-second deadline and bounded response. `--offline` disables this
lookup; without a pin that means alignment is unknown. No token, inference,
dependency installation, Git fetch, or configuration write is involved.

`check` prints a JSON `VersionReport` on stdout: installed/expected versions,
target source (`pin`, `latest`, `none`), alignment, chronological relation,
latest lookup status, and update availability. Exit 0 means aligned, 1 mismatch,
2 unknown/error. Invalid local input prints a sanitized JSON error on stderr.
`session-start` instead emits Claude SessionStart context JSON and exits 0 even
on errors so a temporary outage does not prevent a session.

An older pin may be aligned while `updateAvailable` is true. A development build
may be ahead of latest; never automatically downgrade it. `integrity: not-checked`
means version equality is not proof that manually copied skills, generated files,
or a dirty source tree match a release. The checker verifies package/lock/plugin
version consistency when those metadata files exist. Verify hashes at acquisition
and inspect Git status before source updates.

## Fast polling

Release v2026.1002.2233 provides `poietic-harness poll --config
/absolute/pin.json --cache /absolute/writable/latest-release.json`. Older releases
may have only `check`; verify the installed command before using `poll`. Run the executable
directly for routine polling; it needs no model, skill evaluation, or agent turn.
An external scheduler owns recurrence and notification deduplication.

Successful lookups are reused for five minutes, then conditionally revalidated
with ETag. The default request/body deadline is 1500 ms. `--max-age SECONDS`
changes freshness (`0` refreshes); `--timeout-ms MS` accepts 1 through 5000.
`--offline` permits a fresh cache only. A failed refresh or stale offline entry
means unknown availability, even if the pin aligns. The explicitly selected cache
is disposable public metadata; keep it separate from pins, installation records,
and immutable runtimes. It is the only write, and omitting `--cache` avoids it.

`poll` exits **0 no newer release, 1 update available, 2 unavailable/error**.
This differs from `check` alignment exits: an aligned old pin can yield 1.
The report retains alignment fields and adds cache source/status and lookup time
under `polling`. Always check those fields before describing data as newly fetched.

## Network setup

The online checker needs DNS/TLS and outbound HTTPS to `api.github.com` only.
During installation, verify `check --latest` or an uncached `poll` from the actual
hook/scheduler context and record its supported network permission mechanism.
`check --latest` can exit 0 for an aligned pin while `latest.status` is unavailable.
Do not equate that exit with successful online discovery.

Sandbox permissions are host configuration; an instruction file cannot grant
them. For an authorized lookup blocked at startup, use the host's supported
approval flow if available. If permission is unavailable, report that limitation
and continue local work. Do not retrieve credentials, reinstall the toolkit,
change global permissions, or assume GitHub is down from a generic failure.
For unattended polling, configure the scheduler identity's access during setup.
See [Codex sandboxing](https://learn.chatgpt.com/docs/sandboxing) and
[GitHub conditional requests](https://docs.github.com/en/rest/using-the-rest-api/best-practices-for-using-the-rest-api#use-conditional-requests-if-appropriate),
verified 2026-10-01. Conditional public requests remain rate-limited; no credentials
are read merely to increase limits.
