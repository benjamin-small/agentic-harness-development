# Bootstrap this toolkit

Read this file when asked to install or use this repository from a fresh harness. Use the version of this file associated with the selected release. Start at **v0.1.0-alpha.1**, a foundation prerelease.

## Know what this release provides

It includes portable instruction assets and a read-only catalog planner. The Jev API client, automatic capability detector, installation writer, and native subagent adapters are planned. Do not invoke nonexistent `jev` commands, claim that the UI role has been registered as a subagent, or start a persistent service.

## Resolve scope and capabilities

Use the user's request and existing project choices to select a scope. Ask only when an unresolved choice changes the intended destination or behavior.

| Scope      | Instructions                                                                          | Software and version                                                                 | Credentials                         |
| ---------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------- |
| User       | Selected skills in the harness's personal discovery directory; personal defaults only | Versioned user-owned cache, no administrator install required                        | User environment or secret manager  |
| Project    | Skills relevant to this project; UI specialist selected only for UI work              | Pin release and integrity in project configuration; tools may live in a shared cache | External to committed configuration |
| Deployment | Explicit skills and roles for the deployed identity                                   | Immutable artifact or image, explicit paths, pinned release                          | Deployment secret injection         |

This release requires explicit capabilities. The installing harness may inspect the repository and explain its choice: a real frontend, mobile screen, or desktop UI supports `ui`; a backend-only service does not. Do not infer UI solely from a transitive dependency. In a monorepo, identify the UI subproject. Explicit user/project includes and exclusions override that assessment.

Available capabilities: `ui` and `structured-decisions`. Agent role files are canonical instructions for future native wrappers. Their dependencies can be selected now, but registration remains manual and harness-specific.

## Obtain a pinned release

The consumer needs Node.js 24 LTS or 26 and npm. The following acquisition example additionally uses GitHub CLI and `shasum` on macOS/Linux. The four release assets can also be downloaded from the GitHub release page using another trusted download tool.

```sh
toolkit_dir="$HOME/.local/share/agentic-harness-development/0.1.0-alpha.1"
mkdir -p "$toolkit_dir/assets"
gh release download v0.1.0-alpha.1 \
  --repo benjamin-small/agentic-harness-development \
  --dir "$toolkit_dir/assets"
(cd "$toolkit_dir/assets" && shasum -a 256 -c SHA256SUMS)
npm install --prefix "$toolkit_dir/runtime" --ignore-scripts --no-audit --no-fund \
  "$toolkit_dir/assets/benjamin-small-agentic-harness-development-0.1.0-alpha.1.tgz"
"$toolkit_dir/runtime/node_modules/.bin/harness-kit" validate
"$toolkit_dir/runtime/node_modules/.bin/harness-kit" plan \
  --capability ui --harness claude-code --scope project
```

Use a fresh asset directory or verify existing files; do not silently overwrite a modified installation. Check `manifest.json` for the version, source commit, and expected capabilities. The planner prints JSON and makes no installation changes. The release also contains a source archive for consumers that want a checkout-equivalent tree; developing from source requires `npm ci` and a build.

## Install instruction assets deliberately

The package contains `skills/`, `agents/`, and `catalog.json` under `runtime/node_modules/@benjamin-small/agentic-harness-development/` in the example above.

For each selected skill, copy its entire directory, including references, to the planner's destination. Resolve `~` as the intended harness user's home. Compare existing content before replacing anything; preserve local edits. Installing skills does not require an OpenRouter key. A host may need a reload before discovering new skills.

For the UI reviewer, a capable harness can read the canonical role and selected skill to carry out a review. Automatic native subagent registration is not provided yet. Verify the harness actually discovers the skills and distinguish that result from runtime/tool availability.

For a deployment, use explicit destination paths and the executing service identity. Install during provisioning or image build. On restart, verify and reuse the pinned release; do not resolve latest or upgrade silently. Singleton ownership, state, event handling, and delegation belong to the separate service runtime.

## Record the result

Report the release/tag and source commit, scope, chosen capabilities and evidence, destination paths, executable dependencies installed, validation performed, and remaining limitations. The structured project selection/lockfile and idempotent install command are specified in [the implementation plan](docs/implementation-plan.md) and will arrive in a later milestone.
