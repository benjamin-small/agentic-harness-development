# Harness integration

Verified 2026-10-01. Sources: [Agent Skills specification](https://agentskills.io/specification),
[Claude plugins](https://code.claude.com/docs/en/plugins),
[Claude hooks](https://code.claude.com/docs/en/hooks).

The portable skill's identifier is `update`. Colons are not portable skill-name
characters. The generated Claude plugin is named `poietic-harness`; Claude's
namespace produces `/poietic-harness:update`. Other harnesses can read this skill
when asked for `poietic-harness:update`, but their discovery/invocation syntax
varies. Do not promise the slash command outside Claude Code.

Build source with `npm run build`; release tarballs include
`dist/claude-plugin/poietic-harness`. This self-contained plugin contains the
maintenance runtime, update skill, and SessionStart hook only. It does not
register the UI reviewer or install other software. Test/discover it for a session
with `claude --plugin-dir /absolute/path/to/dist/claude-plugin/poietic-harness`.
Configure the same argument in the user's launch method for subsequent sessions.
No marketplace registration or modification of global settings is automatic.

The hook uses the exec-form Node command with literal `${CLAUDE_PLUGIN_ROOT}` and
`${CLAUDE_PROJECT_DIR}` substitution, a ten-second harness timeout, and the
`startup|resume|clear|fork` matcher. It skips context compaction. Its output is
`hookSpecificOutput` with `hookEventName: SessionStart` and `additionalContext`.
The underlying public release lookup has a five-second timeout; a configured
pin avoids networking by default. Claude Code 2.1.281 is the local validation
target; older versions must support exec-form hooks to use this adapter.

For a harness without this hook, add a short session-start instruction to the
consumer's native guidance (for example its AGENTS.md): run its recorded absolute
`poietic-harness check --project <project-root>` command once, report mismatches
or unavailable checks, and invoke this skill only for a requested update. Use an
explicit `--config <pin>` and `--offline` for service restart checks. An instruction
is cooperative behavior, not a guarantee that an arbitrary harness has a native
startup event. Avoid duplicate registration if the Claude plugin already checks.
