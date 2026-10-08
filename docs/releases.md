# Releases

## Artifacts and versioning

Versions encode the UTC time when a release is prepared: **`YYYY.MMDD.HHMMSS`**, with leading zeros removed from each numeric group. For example, `2026.1001.171432` means **2026-10-01 17:14:32 UTC**; `2026.102.304` means **2026-01-02 00:03:04 UTC**. Tags add `v`, such as `v2026.1001.171432`.

The three numeric groups satisfy [npm's version format](https://docs.npmjs.com/cli/v11/configuring-npm/package-json#version); their meaning is entirely date and time. There are no major/minor/patch compatibility promises, revision counters, or alpha/beta suffixes. Read the changelog and pin exact releases instead of using caret/tilde ranges. Schema versions remain explicit wire-format identifiers, independent of package timestamps.

Run `npm run release:stamp` once while preparing a release. It generates the current UTC timestamp to whole seconds and updates `package.json` plus both root version fields in `package-lock.json`, leaving dependency versions unchanged. For a reproducible timestamp use `npm run release:stamp -- --at 2026-10-01T17:14:32.000Z`. Duplicate or older times are rejected; wait for a new second or correct the clock. Stamping does not commit, tag, or publish. Packing/rebuilding an already stamped release preserves its version. Its GitHub publication time may be later than its preparation time.

Each release contains:

- An npm-compatible `.tgz` with compiled library/CLI, catalog, schemas, skills, roles, and documentation.
- The tarball includes `dist/claude-plugin/poietic-harness`, a self-contained maintenance plugin generated from the canonical update skill and TypeScript runtime. Its manifest and runtime version come from the same package version; private local expertise is excluded from both copies.
- A source `.tar.gz` made from the exact Git commit.
- `manifest.json` containing version, `versioning: "utc-timestamp"`, the full ISO `versionTimestamp`, tag, source commit, runtime requirements, capabilities, limitations, sizes, and SHA-256 hashes.
- `SHA256SUMS` covering both archives and the manifest.

The package is not published to the npm registry. Its `private` flag prevents accidental registry publication while allowing `npm pack` and tarball installation. No postinstall script runs. Native standalone binaries are planned as a later distribution choice.

Current source ships each component's entrypoint and reviewed `knowledge/` and `memory/` indexes/topics. Private `knowledge/local/` and `memory/local/` working material is excluded from npm packages. Packaging rejects any such files that were forcibly added to Git, protecting source archives too. The package tests verify the exclusion with synthetic notes. See [the local expertise convention](local-expertise.md) for maintenance and promotion rules.

## Release procedure

1. Run `npm run release:stamp`, then move ready `Unreleased` entries into its exact timestamp section following [the changelog policy](changelog.md). Confirm significant additions, fixes, removals, migration actions, and limitations match the shipped changes. Update the bootstrap example and `docs/release-notes/v<VERSION>.md`; release notes summarize and link to the canonical changelog section. Use a pull request.
2. Run `npm run check`; document measured coverage and actual scope of native/live validation.
3. Commit changes. Packaging requires a clean checkout so `sourceCommit` identifies all tracked content.
4. Run `npm run release:pack` and `npm run release:verify`. The latter installs the exact tarball in a fresh temporary consumer, resolves declared runtime dependencies, imports the library, validates bundled references, and invokes the installed CLI binary.
5. Once CI passes for the intended commit, create and push the matching annotated tag. The release workflow validates the date/time, package/lockfile/tag agreement, rebuilds, verifies the consumer, and publishes the assets with the committed release notes. Timestamp releases are regular GitHub releases; this classification does not imply compatibility or completed live validation.
6. Download the GitHub assets to a fresh directory and run `node scripts/verify-release.mjs /absolute/path/to/downloaded-assets`. Confirm the tag, timestamp, source commit, and asset list.

If a workflow fails before publication, fix the failure and follow the documented tag/release state. Do not silently move a published tag or overwrite released assets. Publish a new version for a changed artifact. Rollback means restoring a retained previous pinned release (or separately preserved verified artifacts) and its recorded configuration.

Historical tags and versions remain unchanged, including `v0.1.0-alpha.1` and `v0.1.0-alpha.2`. Their release assets are subject to retention below. The verifier accepts legacy manifests; new releases must use timestamp metadata.

Checksums depend on trusting their source. They are not signatures. Artifact signing/attestation can be added when a consumer requires that stronger provenance contract.

## Consumer scope

Use the [maintenance checker](maintenance.md) for startup alignment. Its exact
version pin is separate from the future capability/install lock; continue recording
artifact hashes and paths in provisioning records. A check never installs software
or changes the pin. `poietic-harness:update` guides an explicit upgrade and
preserves scoped local expertise.

[BOOTSTRAP.md](../BOOTSTRAP.md) distinguishes personal defaults, project capabilities, and deployment provisioning. Dependencies for the current package are pinned to exact direct versions. Future installations must record release identity and integrity alongside project selection; an npm lockfile in the consumer also captures transitive dependency resolution.

## Release retention

Keep four published GitHub releases, ordered by publication time (newest first), including prereleases. Drafts are outside this count and must not be deleted by this procedure. This is a manual release step, not an automatic deletion workflow.

After the new regular release has passed downloaded-asset verification, enumerate all published releases and record the exact retained and deletion sets. Require the newly verified regular release to be among the retained four, and ensure GitHub's latest regular release resolves to a retained release. Re-read before deletion; if publication state changed, stop and recompute rather than deleting from a stale list. Delete only older GitHub release entries and attached assets. Preserve Git tags, commits, source history and changelog entries; do not use a tag-deletion option. Confirm exactly four published releases remain and the new release is still available.

Pruning removes download availability for older pins. Existing installed runtimes and verified cached release artifacts can still be used; a maintenance metadata cache cannot reinstall a removed release. Rollback to a pruned version requires retained artifacts or a separately verified source build. Consumers must explicitly select an available release to reinstall; never silently migrate their pins.
