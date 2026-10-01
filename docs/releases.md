# Releases

## Artifacts and versioning

Use semantic versions and exact Git tags (`v0.1.0-alpha.1` initially). Prerelease interfaces may change. Each release contains:

- An npm-compatible `.tgz` with compiled library/CLI, catalog, schemas, skills, roles, and documentation.
- A source `.tar.gz` made from the exact Git commit.
- `manifest.json` containing version, tag, source commit, runtime requirements, capabilities, limitations, sizes, and SHA-256 hashes.
- `SHA256SUMS` covering both archives and the manifest.

The package is not published to the npm registry. Its `private` flag prevents accidental registry publication while allowing `npm pack` and tarball installation. No postinstall script runs. Native standalone binaries are planned as a later distribution choice.

Current source ships each component's entrypoint and reviewed `knowledge/` and `memory/` indexes/topics. Private `knowledge/local/` and `memory/local/` working material is excluded from npm packages. Packaging rejects any such files that were forcibly added to Git, protecting source archives too. The package tests verify the exclusion with synthetic notes. See [the local expertise convention](local-expertise.md) for maintenance and promotion rules.

## Release procedure

1. Update package version and lockfile, changelog, relevant bootstrap examples, and `docs/release-notes/v<VERSION>.md`. Use a pull request after initial repository creation.
2. Run `npm run check`; document measured coverage and actual scope of native/live validation.
3. Commit changes. Packaging requires a clean checkout so `sourceCommit` identifies all tracked content.
4. Run `npm run release:pack` and `npm run release:verify`. The latter installs the exact tarball in a fresh temporary consumer, resolves declared runtime dependencies, imports the library, validates bundled references, and invokes the installed CLI binary.
5. Once CI passes for the intended commit, create and push the matching annotated tag. The release workflow checks tag/version alignment, rebuilds, verifies the consumer, and publishes the assets with the committed release notes.
6. Download the GitHub assets to a fresh directory and run `node scripts/verify-release.mjs /absolute/path/to/downloaded-assets`. Confirm the GitHub release's tag, prerelease flag, source commit, and asset list.

If a workflow fails before publication, fix the failure and follow the documented tag/release state. Do not silently move a published tag or overwrite released assets. Publish a new version for a changed artifact. Rollback means restoring a previous pinned release and its recorded configuration.

Checksums depend on trusting their source. They are not signatures. Artifact signing/attestation can be added when a consumer requires that stronger provenance contract.

## Consumer scope

[BOOTSTRAP.md](../BOOTSTRAP.md) distinguishes personal defaults, project capabilities, and deployment provisioning. Dependencies for the current package are pinned to exact direct versions. Future installations must record release identity and integrity alongside project selection; an npm lockfile in the consumer also captures transitive dependency resolution.
