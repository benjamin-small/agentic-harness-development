# Jev MCP removal and migration

The MCP adapter introduced in v2026.1003.200942 is removed from current source
(unreleased change, 2026-10-08). Jev uses its CLI and TypeScript library directly.
Do not register a Jev MCP server or use old exposed Jev MCP tools.

1. Remove only the Jev server entry and its nested environment settings from the
   effective harness configuration. Preserve unrelated integrations.
2. Refresh the complete Jev skill, preserving private knowledge and memory.
3. Keep the pinned runtime, cached credential file and persistent logs. Use the
   [direct invocation procedure](../skills/jev/knowledge/tool-use.md) and
   [recipes](../skills/jev/knowledge/recipes.md). The CLI takes credentials through
   command-scoped OPENROUTER_API_KEY; it does not read JEV_API_KEY_FILE itself.
4. Reload or restart the harness and check fresh discovery. Removing saved
   configuration does not unload a server from an already-running session.

Previously published release archives are immutable and may still contain the
old adapter. Its presence does not require running it. Legacy mcp telemetry
surface values remain readable; they do not enable a server. No new runtime
release or pin change is required to stop using the server. Historical verification
records describe their tested artifacts, not the current supported architecture.
