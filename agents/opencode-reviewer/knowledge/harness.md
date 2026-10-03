# OpenCode compatibility checks

Primary documentation reviewed 2026-10-03. Identify the installed version and
whether a proposal targets V1 or V2 before accepting configuration examples.

- **Versioned schemas:** V1 agent/permission/bash/task names differ from V2
  agents/permissions/shell/subagent. Do not combine schemas across generations.
  [V1 agents](https://opencode.ai/docs/agents/),
  [V2 permissions](https://opencode.ai/v2/docs/permissions/)
- **Role discovery:** Our AGENT.md layout requires explicit loading or translation
  into native agent configuration. A catalog path is not registration. Check skill
  discovery separately. [Skills](https://opencode.ai/docs/skills/)
- **Fresh context:** V2 describes fresh child sessions that still receive project
  instructions and other context sources. Require no reused transcript and report
  inherited instructions/tools; do not imply sandbox isolation. Parent-only review
  coordination prevents child instructions from recursively spawning reviewers.
  [V2 agents](https://opencode.ai/v2/docs/agents/)
- **Instructions:** AGENTS.md links are not automatically expanded. A workflow
  trigger must explicitly instruct the agent to read its referenced document.
  Check applicable local/global precedence. [Rules](https://opencode.ai/docs/rules/)
- **Permissions:** Verify the child's actual execution policy, including shell and
  connector mutation paths. Read-only wording is not enforcement; auto-approval
  modes may alter ask behavior. [V1 permissions](https://opencode.ai/docs/permissions/)

Review fresh installation, project/global conflicts, denied tools, unavailable
network and explicit migration paths. Mark native execution unverified unless a
probe ran in the target version. Do not install adapters or run inference merely
to resolve missing evidence.
