# Embedded tools

Executable components live under `tools/<id>/`. Skills and agent roles remain the
portable instruction layer; a skill refers to a tool without owning its source.
The toolkit release explicitly embeds selected tool outputs and exposes stable
commands/library exports through its root package manifest.

| Component            | Instruction entrypoint              | Software identity | Implementation |
| -------------------- | ----------------------------------- | ----------------- | -------------- |
| [Jev](jev/README.md) | [Jev skill](../skills/jev/SKILL.md) | `jev-runtime`     | `tools/jev/`   |

Each tool owns its source, tests, build configuration, runtime manual and scoped
expertise. Tool manifests are private and share the toolkit's release version;
they are not independent registry releases. Root scripts compose builds, checks
and artifacts. Tool runtime source does not import generic harness internals, and
generic harness runtime source does not import tool internals.

The root catalog and maintenance runtime implement harness selection and upkeep.
Their code remains repository infrastructure under `src/`; root `scripts/` owns
generic build/release orchestration. Jev-specific executable implementation and
verification scripts belong to the embedded tool.
