# Codex compatibility checks

Primary documentation reviewed 2026-10-03. Record target surface (desktop, CLI,
IDE or API), installed version, execution host and actual tool schema. These
criteria are not evidence of native agent registration or runtime success.

- **Registration:** Current custom-agent documentation uses standalone TOML files
  under `.codex/agents/` or `~/.codex/agents/` with name, description and
  developer_instructions. A portable AGENT.md must be explicitly passed as role
  content or adapted; it is not automatically a registered agent.
- **Freshness:** Use a new child with a bounded packet, not a resumed or inherited
  parent conversation. Inspect the current spawn tool schema; `fork_turns: none`
  is only an example for tools exposing that field. Record the actual mechanism.
- **Permissions:** Inspect effective child permissions. Parent live permission
  overrides can supersede custom-agent defaults; read-only prose does not enforce
  a sandbox. [Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- **Instructions:** Check global/project instruction hierarchy, override files,
  size limits and working directory. Fresh history does not remove applicable
  project or user instructions. A short linked workflow must explicitly be read.
  [AGENTS.md](https://learn.chatgpt.com/docs/agent-configuration/agents-md)
- **Access:** Separate command filesystem/network access from hosted tools, apps
  and MCP permissions. A command rule is not a global domain allowlist. Verify
  rule matching, actual execution and reload requirements separately.
  [Security](https://learn.chatgpt.com/docs/agent-approvals-security)

Challenge skill metadata/discovery, user vs project destinations, aliases,
startup duplication, custom CODEX_HOME and subprocess environment assumptions.
Use official OpenAI documentation for volatile product behavior and the current
host's observed schema for tool availability. Report gaps rather than replacing
the requested host with a different Codex surface.
