# Bootstrap this toolkit

Read this file when asked to install or use this repository from a fresh harness. Use the guide associated with the selected release. This guide targets **v2026.1002.125921**, with the Jev runtime, [local expertise convention](docs/local-expertise.md), and catalog schema 2. Package versions encode UTC date and time; they make no compatibility promise. Read the tag's guide when consuming an older release.

## Know what this release provides

It includes portable instructions, a read-only catalog planner, the Jev TypeScript library/CLI, and version maintenance tools. The optional Claude Code maintenance plugin adds `/poietic-harness:update` and a read-only SessionStart check. Automatic capability detection, installation writes, and native subagent adapters remain planned. Registering the UI reviewer still needs a harness-specific procedure; persistent services belong in their own runtime.

## Resolve scope and capabilities

Use the user's request and existing project choices to select a scope. Ask only when an unresolved choice changes the intended destination or behavior.

| Scope      | Instructions                                                                          | Software and version                                                                 | Credentials                         |
| ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| User       | Selected skills in the harness's personal discovery directory; personal defaults only | Versioned user-owned cache, no administrator install required                        | User environment or secret manager  |
| Project    | Skills relevant to this project; UI specialist selected only for UI work              | Pin release and integrity in project configuration; tools may live in a shared cache | External to committed configuration |
| Deployment | Explicit skills and roles for the deployed identity                                   | Immutable artifact or image, explicit paths, pinned release                          | Deployment secret injection         |

This release requires explicit capabilities. The installing harness may inspect the repository and explain its choice: a real frontend, mobile screen, or desktop UI supports `ui`; a backend-only service does not. Do not infer UI solely from a transitive dependency. In a monorepo, identify the UI subproject. Explicit user/project includes and exclusions override that assessment.

Available capabilities: `ui`, `structured-decisions`, and `toolkit-maintenance`. Agent role files are canonical instructions for future native wrappers. Their dependencies can be selected now, but registration remains manual and harness-specific.

## Obtain a pinned release

The consumer needs Node.js 24 LTS or 26 and npm. The following acquisition example additionally uses GitHub CLI and `shasum` on macOS/Linux. The four release assets can also be downloaded from the GitHub release page using another trusted download tool.

```sh
toolkit_dir="$HOME/.local/share/agentic-harness-development/2026.1002.125921"
mkdir -p "$toolkit_dir/assets"
gh release download v2026.1002.125921 \
  --repo benjamin-small/agentic-harness-development \
  --dir "$toolkit_dir/assets"
(cd "$toolkit_dir/assets" && shasum -a 256 -c SHA256SUMS)
npm install --prefix "$toolkit_dir/runtime" --ignore-scripts --no-audit --no-fund \
  "$toolkit_dir/assets/benjamin-small-agentic-harness-development-2026.1002.125921.tgz"
"$toolkit_dir/runtime/node_modules/.bin/harness-kit" validate
"$toolkit_dir/runtime/node_modules/.bin/harness-kit" plan \
  --capability ui --harness claude-code --scope project
```

Use a fresh asset directory or verify existing files; do not silently overwrite a modified installation. Check `manifest.json` for the version, source commit, and expected capabilities. The planner prints JSON and makes no installation changes. The release also contains a source archive for consumers that want a checkout-equivalent tree; developing from source requires `npm ci` and a build.

## Install instruction assets deliberately

The package contains `skills/`, `agents/`, and `catalog.json` under `runtime/node_modules/@benjamin-small/agentic-harness-development/` in the example above.

For each selected skill, copy its entire directory, including references, to the planner's destination. Resolve `~` as the intended harness user's home. Compare existing content before replacing anything; preserve local edits. Installing skills does not require an OpenRouter key. A host may need a reload before discovering new skills.

When using the current indexed layout in a Git-tracked project, ensure the destination's `knowledge/local/` and `memory/local/` directories are ignored before recording private notes. Source-tree ignore files are not guaranteed to survive npm packaging or installation into another repository; the installing harness must verify the destination rules.

For the UI reviewer, a capable harness can read the canonical role and selected skill to carry out a review. Automatic native subagent registration is not provided yet. Verify the harness actually discovers the skills and distinguish that result from runtime/tool availability.

For a deployment, use explicit destination paths and the executing service identity. Install during provisioning or image build. On restart, verify and reuse the pinned release; do not resolve latest or upgrade silently. Singleton ownership, state, event handling, and delegation belong to the separate service runtime.

## Configure executable tools separately

The catalog declares `jev-runtime` as software required to execute the Jev skill. It is bundled with the same package and version, exposed as `node_modules/.bin/jev` and the `/jev` library export. Installing only `skills/jev/` provides instructions, not this runtime. A UI-only selection needs no Jev credentials or inference.

For personal use, keep the pinned runtime in the user-owned cache above and give the harness its absolute executable path. For project use, record that exact version, path, and artifact integrity in the project's setup instructions; a project-local npm tarball installation is also valid. For deployments, include the package during image/provisioning build and pass its path and secrets to the service identity. Do not modify global npm packages or shell profiles implicitly.

Verify `"$toolkit_dir/runtime/node_modules/.bin/jev" --version`, then use its `validate` command on a synthetic request from the [runtime manual](docs/jev-runtime.md). Inject `OPENROUTER_API_KEY` only into processes authorized to invoke inference. A live `decide` or `batch` call sends state externally and may bill; package installation and local validation do neither. Live library and CLI validation is recorded in the [Jev verification report](docs/verification/jev-2026-10-01.md); this does not establish decision quality for your workload.

## Record the result

### Register session checks and the update skill

This release enables persistent logging for every shared-client Jev
library and CLI call at `~/.local/state/poietic-harness/jev/calls.jsonl`. Record
the writable log path and execution identity during provisioning; use
`JEV_LOG_PATH` or client `logPath` for an absolute override outside the immutable
runtime. The file is created on the first call. Terminal `--quiet` does not
disable persistent logging. Failed persistence returns non-retryable `IO_ERROR`.
See the
[logging contract](docs/jev-runtime.md#persistent-call-logging) before upgrading.

Record the chosen exact release in the consumer's `.poietic-harness.json` using
`{ "schemaVersion": 1, "version": "<selected timestamp>" }`. Run that installation's
`poietic-harness check --project /absolute/project`. Pinned checks stay local by
default; request `--latest` separately to discover new releases. For a user or
deployment pin outside a project, use `--config /absolute/pin.json --offline`.
Do not change pins or install updates at startup.

Verify online discovery from the actual startup hook or scheduler context and
record its network setup alongside the runtime path. The checker needs outbound
HTTPS to `api.github.com`; package instructions do not grant sandbox permissions.
Use the host's supported permission flow for an authorized blocked lookup, and
report unavailable status if access cannot be granted. Do not change global
permissions at startup. Inspect `latest.status` as well as alignment: a pinned
`check --latest` may exit 0 even when the remote lookup failed. See
[network setup and failure handling](docs/maintenance.md#network-permissions-at-installation-and-startup).

This release provides [fast deterministic polling](docs/maintenance.md#fast-polling-without-inference)
for direct scheduler execution without a model turn. Use the installed `poll`
command for routine availability checks; it does not update the runtime or pin.

For Claude Code, launch with
`claude --plugin-dir "$toolkit_dir/runtime/node_modules/@benjamin-small/agentic-harness-development/dist/claude-plugin/poietic-harness"`.
Preserve that argument in the chosen launch configuration. This enables the
native startup check and `/poietic-harness:update` without registering UI or Jev
components. For another harness, follow [the maintenance guide](docs/maintenance.md)
to install the selected maintenance skills and add a short session-start invocation.
This release includes the `poietic-harness-start` skill; releases through
v2026.1002.2233 contain only `update`. Install and verify the startup skill before
replacing existing startup guidance with its invocation.
Use one registration path per consumer; portable skill copying does not enable
native hooks. The release includes the checker as `node_modules/.bin/poietic-harness`
and the `/maintenance` TypeScript library export.

The update skill guides explicit scoped upgrades through verified release
acquisition, staged installation, preservation of local expertise, and rollback.
It does not silently upgrade a shared cache, running service, or development
checkout. Version equality checks metadata; it does not verify manually copied
skills or source-tree contents.

### Record credential connections

When the user configures Jev credentials, save the non-secret connection details and verified injection recipe under the installed Jev skill's `knowledge/local/`, with a local index. Record the provider, profile/identity, project identifier, environment, secret path/name, and verification date. Reuse the provider's existing login/session; never copy secret values into skill files, installation records, or releases. Preserve this record during updates. Do not retrieve credentials or run inference merely to complete ordinary startup. When the user requests local credential caching, provision the actual key in an owner-only credential file or OS credential store outside repositories and skill content. Record the local read recipe and explicit refresh policy; normal invocation must not silently fall back to a network fetch. A configured secret source is separate from live inference verification.

### Preserve expertise and report installation

When setting up a consuming project, put its maturity badge directly below the primary README title and link it to [the shared scale](docs/repository-maturity.md). Use the guide's absolute-link example for another repository, select Tinker, Alpha, Beta, or Stable from that project's evidence, and add a brief status explanation. Assess the consuming project independently of this toolkit's maturity. Preserve an existing justified assessment; log any stage change.

For components using the indexed layout, provision their own writable, scoped directories for knowledge and memory, separate from the pinned package/cache. Copy the released indexes and topics, preserve local material during upgrades, and use local search before loading detailed files. Do not copy private `knowledge/local/` or `memory/local/` content into another project or a shared release. See [local expertise](docs/local-expertise.md) for maintenance and scope rules. This remains a host-managed procedure until the installer milestone is implemented.

Report the release/tag and source commit, scope, chosen capabilities and evidence, destination paths, executable dependencies installed, validation performed, and remaining limitations. The structured project selection/lockfile and idempotent install command are specified in [the implementation plan](docs/implementation-plan.md) and will arrive in a later milestone.
