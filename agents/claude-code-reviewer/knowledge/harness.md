# Claude Code compatibility checks

Primary documentation reviewed 2026-10-03; these are review criteria, not native
execution evidence. Record the installed Claude version and target surface.

- **Instructions:** Verify whether repository guidance is loaded. Current docs
  describe AGENTS.md support through the agents-md plugin from v2.1.277, with
  CLAUDE.md/CLAUDE.local.md precedence. Check configuration and ancestor files;
  use a documented import when needed. Do not assume every Claude installation
  sees this repository's short trigger. [Memory](https://code.claude.com/docs/en/memory)
- **Discovery and freshness:** A portable AGENT.md needs an explicit prompt or
  native adapter. Newly created ordinary subagents have separate history;
  conversation forks and resumed agents differ. Project instructions and supplied
  skills may still enter context. Require a bounded task packet and actual
  registration/discovery evidence. [Subagents](https://code.claude.com/docs/en/sub-agents)
- **Skills:** Check preloading versus discovery and whether references are loaded.
  Skill `context: fork` is an isolated task mode, not synonymous with a conversation
  fork. [Skills](https://code.claude.com/docs/en/skills)
- **Permissions:** Review actual tool permissions, not only “read-only” prose.
  Shell and connectors can mutate state even when editing tools are absent.
  [Permissions](https://code.claude.com/docs/en/permissions)
- **Hooks/plugins:** Check event semantics, scope, execution identity, timeout,
  output contract and startup duplication. Command hooks execute with user
  permissions; do not add one implicitly to enforce a review process.
  [Hooks](https://code.claude.com/docs/en/hooks)

Falsify claims using fresh install, existing user/project overrides, offline and
restricted execution, and plugin reload scenarios relevant to the change. Return
the smallest correction and the native probe still needed. Recheck volatile claims
against primary docs before relying on this dated summary.
