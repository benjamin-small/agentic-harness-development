# Pi compatibility checks

Primary upstream reviewed 2026-10-03. Current main is not evidence about an older
installed Pi release; record the version, mode and extensions actually in use.

- **Delegation:** Pi's upstream subagent example requires an extension. It loads
  flat agent definitions, not our agents/<id>/AGENT.md layout. Check explicit role
  injection or a native adapter, agent scope, selected tools and extension loading.
  Never claim that catalog selection creates a Pi subagent.
  [Subagent example](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/README.md)
- **Fresh history:** The example uses separate subprocesses with `--no-session`
  and role text supplied through `--append-system-prompt`. This does not prove
  filesystem, environment or credential isolation. Check inherited resources,
  cancellation, structured output and truncation.
  [Example implementation](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/examples/extensions/subagent/index.ts)
- **Trust/access:** Project trust is distinct from operating-system access and
  per-tool approval. Unresolved noninteractive trust may skip project resources;
  context instruction files have different loading rules. Never silently change
  trust or add approval flags to make a test pass.
  [Security](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/security.md)
- **Skills:** Verify the active skill roots, naming, explicit/model invocation,
  duplicate names and reload behavior. Skill discovery is not role discovery.
  [Skills](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/skills.md)
- **Extensions:** Inspect actual process authority and interactive versus print/JSON
  capabilities. Do not repeat old blanket claims that Pi lacks MCP or project
  trust; verify the installed release.
  [Extensions](https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md)

A missing authorized extension or delegation facility is an unverified integration,
not permission to install software or substitute a single-context simulated review.
