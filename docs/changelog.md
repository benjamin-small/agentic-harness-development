# Changelog policy

`CHANGELOG.md` is the canonical, readable record of significant changes for people and agentic harnesses. Every significant addition, fix, removal, or behavior change **must have an entry in the same pull request**. This includes software, CLI/library interfaces, schemas, installation, security, and changes to skill or agent instructions that affect how they work.

A change is significant when a consumer or maintainer would need to know about it to use, upgrade, troubleshoot, or contribute to the toolkit. Routine formatting, typo corrections, and internal refactors with no observable effect can omit an entry; briefly explain the omission in the pull request. Group related work into useful outcomes and avoid listing individual commits or implementation steps.

## Structure

- Keep `## Unreleased` at the top for changes not yet published.
- Put released sections below it, newest first, using `## <package-version> — <YYYY-MM-DD HH:mm:ss UTC>`. The date/time must match the release-preparation timestamp recorded in the manifest.
- Use these level-three categories when applicable: `Added`, `Changed`, `Fixed`, `Deprecated`, `Removed`, and `Security`. Omit empty categories.
- Write one logical change per bullet, starting with a stable area name such as `**Jev CLI:**`, `**Catalog:**`, or `**UI reviewer:**`. Use exact command, API, schema, and component names so entries are easy to search.
- Keep Markdown as the single maintained source. Release notes summarize the corresponding section and link to it; avoid a separately maintained JSON changelog.

## Entry content

Each entry must explain **what changed and why it matters** in language understandable without the pull request or prior conversation. Include the previous and resulting behavior when it clarifies a fix or change. Link to relevant instructions, issues, or pull requests when more detail is useful; links supplement the explanation.

For an incompatible change, start with `**Breaking — <area>:**` and include the affected interface or path, old/new behavior, and the exact migration action or a linked migration guide. For removals and deprecations, identify the replacement or state that none exists; give the removal timing when known. Record material limitations or verification gaps alongside the affected change, especially when mock tests could be mistaken for live or native-harness validation.

Use concise, concrete sentences. Avoid vague entries such as “improvements,” “miscellaneous fixes,” or commit hashes without an explanation. Do not include credentials, private state, or local working notes.

Illustrative format (these entries describe fictional changes):

```markdown
## Unreleased

### Added

- **Jev CLI:** Add `--example-mode` to validate a synthetic request locally, allowing setup checks without credentials.

### Fixed

- **Catalog:** Preserve explicit exclusions when resolving optional components so backend-only projects no longer select UI guidance.

### Removed

- **Breaking — Example API:** Remove `oldMethod()`; replace calls with `newMethod()` before upgrading.
```

## Release and harness use

During release preparation, move the ready entries from `Unreleased` into the exact stamped version section. Leave pending work under `Unreleased`. Check that additions, fixes, removals, migration instructions, and known limitations agree with what the artifacts actually ship. Preserve historical version labels and entries; explain any necessary factual correction explicitly rather than silently changing the record.

Harnesses should use the headings to distinguish unpublished changes from releases, then read the relevant component entries between their pinned release and the target release. Use breaking-change, deprecation, and removal entries to plan upgrade work. Timestamp ordering alone does not establish compatibility. Older sections may predate this format; interpret their prose rather than treating a missing category or area prefix as proof that nothing changed.
