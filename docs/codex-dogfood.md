# Isolated Codex bootstrap test

This opt-in test gives a fresh Codex CLI the public repository URL and an example
project. The agent must acquire the release and perform the installation using
the published guidance. The runner does not install toolkit skills or tools for
it. A second, separate Codex process reviews the example using the resulting
project guidance, allowing us to inspect session startup and skill use. The request
explicitly includes Jev's `structured-decisions` capability alongside capabilities
appropriate to the UI fixture. Both sessions may validate synthetic Jev inputs
locally; neither may invoke inference.

The example intentionally begins with just a README and static UI file, without
a maturity badge, project instructions, pin, or toolkit installation. Codex's
built-in system skills are allowed; personal skills, plugins, project files, and
conversation history are not imported.

## Isolation and authentication

The image runs Codex 0.156.1 as the non-root `node` user on Node.js 24. Container
capabilities are dropped, privilege escalation is disabled, and the system image
is read-only. Home, workspace, evidence, and temporary directories use disposable
memory-backed filesystems. No host files or Docker socket are mounted. Outbound
networking is enabled for model access and public downloads; this test does not
enforce an egress domain allowlist.

Docker is the command-isolation boundary for authenticated runs. Codex's inner
sandbox is disabled **inside this container only**, because the tested Docker
configuration blocks the nested namespaces required by its Linux sandbox. Never
run that Codex bypass command directly on the host.

An authenticated run needs explicit consent to transfer a login cache and use
this bypass. The cache is sent over process stdin into the container's temporary
home, never into image layers, bind mounts, or source control. Code running in
the container can read it. The runner redacts known credential values from saved
evidence, checks that the host cache is unchanged, and removes the container in
normal completion, failure, SIGINT, and SIGTERM paths. It cannot handle SIGKILL
or a host crash; the container's main process expires after 30 minutes. Credentials
are in tmpfs and disappear when the container stops.

This follows OpenAI's documented [headless authentication approach](https://learn.chatgpt.com/docs/auth).
The clean home separates [Codex configuration and state](https://learn.chatgpt.com/docs/config-file/config-advanced).
Credential-free preflight does not read or copy a login and makes no model call.
Authenticated tests consume the account's Codex allowance; Jev/OpenRouter calls,
pushes, deployment, and other external actions are excluded from the test prompt.

## Run

Docker is required on the host. Build only from the small fixture context:

Run from a source checkout; the evaluation scripts and fixture are not part of
the installed runtime tarball.

```sh
docker build --build-arg CODEX_VERSION=0.156.1 \
  -t poietic-codex-dogfood:0.156.1 tests/dogfood
node scripts/dogfood-codex.mjs --preflight \
  --output /absolute/new-preflight-directory
```

The preflight proves an empty configuration, verifies isolation settings, queries
Codex's native `skills/list` discovery API, and removes the container. Authentication
is not necessary for these checks. The output directory must not already exist.

After explicit approval of the credential and bypass conditions above:

```sh
node scripts/dogfood-codex.mjs \
  --auth /absolute/path/to/codex/auth.json \
  --allow-login-copy \
  --output /absolute/new-test-directory
```

The runner uses the CLI's default model with a blank config. Each model session
has a ten-minute limit and bounded captured output. It retains sanitized JSONL
events, final responses, before/after native skill inventories, project text files,
Git status, and isolation/cleanup records. It does not export the container's
home, authentication file, or Codex state. Treat evaluation logs as private until
reviewed, even after automated redaction.

The runner rejects missing, disabled, or incorrectly scoped `jev`, `ui-standards`,
and `update` skills using native discovery. `discovery-check.json` records that
check. The remaining acceptance criteria require evidence review; process success
alone does not establish them.

For interactive exploration, use `docker exec -it -w /workspace/project
<container-name> /bin/bash` while the container is running. The runner normally
removes the container when the test finishes. Exploring or editing a paused run
does not produce an untouched bootstrap result: repeat the automated test in a
new container afterward. Pausing processes does not extend the container lifetime
or the session deadline.

## Acceptance review

A completed process is not a passing installation. Inspect the retained evidence
and report each result separately:

- The agent independently acquired an exact public release, checked its manifest
  and checksums, installed executable dependencies, and validated the installed
  package outside this source checkout.
- The UI fixture received the relevant instructions, explicitly requested Jev
  capability, and maintenance skill. Codex's
  native discovery API sees their project paths, with no discovery errors. Do not
  infer native agent registration from an ordinary role file.
- The project pin, executable paths, install record, and session-start guidance
  agree. The fresh session actually executes the version check and loads relevant
  installed expertise before its review.
- Jev's executable version agrees with the pin, and a synthetic request passes
  local validation. The fresh session reads the installed Jev skill and uses its
  runtime without claiming a live provider result. Having a sample request file
  or a bundled executable alone does not establish skill installation.
- The installed component copies retain the full knowledge/memory layout and
  private local directories are ignored. Runtime caches and writable expertise
  remain separate.
- The example README adopts the maturity convention when that convention is in
  the consumed instructions. Report any difference between `main` and the pinned
  release instead of silently treating unreleased guidance as released behavior.
- No Jev inference or unrequested external actions occur; the host configuration
  and auth cache remain unchanged, and the container is removed.

Use gaps to improve bootstrap guidance, then repeat in a new empty container.
Do not repair the example by hand and call the agent's bootstrap successful.
