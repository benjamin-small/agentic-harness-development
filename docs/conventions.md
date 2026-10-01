# Conventions and compatibility

Documentation checked on 2026-10-01. The following are upstream documented capabilities, not evidence that this repository has completed native integration tests.

## Open formats

- [Agent Skills](https://agentskills.io/specification): directory with SKILL.md; YAML `name` and `description`; optional scripts, references, and assets. Use portable metadata and keep detailed guidance outside the entrypoint.
- [AGENTS.md](https://agents.md/): repository context, build/test instructions, and conventions. It does not instantiate an agent.
- [MCP](https://modelcontextprotocol.io/docs/getting-started/intro): tool/service interoperability; an optional future interface for Jev.
- [A2A](https://a2a-protocol.org/latest/): communication between independent agents; deferred.
- [Open Agent Spec](https://github.com/oracle/agent-spec): declarative executable agents/flows. Its documented framework adapters do not establish native adoption across the coding harnesses below. Defer until there is a concrete runtime consumer.

## Harness discovery

| Harness                                                                                  | Project skill destination used by our planner | Agent integration status             |
| ---------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------ |
| [Claude Code](https://code.claude.com/docs/en/skills)                                    | `.claude/skills/`                             | Planned Markdown adapter             |
| [Codex](https://learn.chatgpt.com/docs/build-skills)                                     | `.agents/skills/`                             | Planned TOML adapter                 |
| [Cursor](https://cursor.com/docs/skills)                                                 | `.agents/skills/`                             | Planned                              |
| [GitHub Copilot](https://docs.github.com/en/copilot/reference/customization-cheat-sheet) | `.agents/skills/`                             | Planned                              |
| [OpenCode](https://opencode.ai/docs/skills)                                              | `.agents/skills/`                             | Planned                              |
| [Pi](https://pi.dev/docs/latest/skills)                                                  | `.agents/skills/`                             | Planned TypeScript extension/package |
| [Gemini CLI](https://geminicli.com/docs/cli/skills/)                                     | `.agents/skills/`                             | Planned                              |

Personal skill roots use the equivalent directory under the user's home. A deployment must choose an explicit destination at provisioning; the planner emits no implicit home directory for deployments. Discovery, precedence, and supported metadata differ among harnesses.

Current [Claude instruction loading](https://code.claude.com/docs/en/memory#agentsmd) supports AGENTS.md subject to version and CLAUDE.md precedence. Older sessions can use a CLAUDE.md with an `@AGENTS.md` import. Verify actual discovery when installing.

## Packaging

[Vercel's skills CLI](https://github.com/vercel-labs/skills) provides cross-harness skill installation. [Pi packages](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md) bundle skills and TypeScript extensions. Native plugins can provide convenient distribution, but shared content remains canonical here. Future bootstrap code must verify pinning and installation behavior before relying on an external installer.
