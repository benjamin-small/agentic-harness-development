# First-time personal setup

Use only when no personal installation exists and installation is authorized by
the user or their standing setup instruction. A missing/broken existing runtime
or a new release is not permission to reinstall or upgrade.

1. Read the public README and BOOTSTRAP.md from
   https://github.com/benjamin-small/agentic-harness-development. Resolve the latest
   regular release, then follow that tag's guide and manifest. Verify checksums
   before installing its tarball into the documented versioned user cache.
2. Select `structured-decisions` and `toolkit-maintenance` for Codex user scope.
   Copy complete selected skill directories to the planner's destinations;
   preserve existing content and local edits. The startup skill must be installed
   before an AGENTS.md invocation points to it. Older releases omit this skill;
   preserve an explicitly installed source copy and record its separate provenance.
3. Record the exact version in `${CODEX_HOME:-~/.codex}/poietic-harness/.poietic-harness.json`
   using the release's pin schema. Put executable paths, artifact integrity,
   component destinations, verification, and host network setup in the adjacent
   `INSTALLATION.md`. Do not modify a source checkout to serve as the user runtime.
4. Provision the [portable startup command and host access](host-access.md) during authorized setup; verify the actual execution context and record its invocation in this skill's private local knowledge. Use the Codex-specific wrapper only for its documented layout.
5. Validate the installed catalog/runtime locally, verify native skill discovery,
   and perform the [routine checks](checking.md). Report release, scope, paths,
   results, and any reload needed. No credentials or paid inference are needed.

Keep standing context short. In the host's global instructions, retain the startup
invocation and add the default Jev preference after discovery is verified:

> At session start, run $poietic-harness-start. Initial user-scope setup is authorized.
> Use $jev by default for suitable bounded structured decisions; read its skill and pass its entrypoint and authorized execution access to subagents.

For hosts without dollar-name invocation, explicitly instruct the agent to read
the installed Jev SKILL.md at its absolute path. Provision other hosts with their
own personal discovery and global instruction locations; a Codex installation
does not configure every harness. Keep execution and child-access details in the
installed Jev skill, following its `knowledge/default-use.md`. This setup does not
itself authorize inference; record applicable user authorization separately.

For repository development, follow the release's project-scope procedure. Add UI
standards and the portable UI role only for actual UI work, honoring explicit
includes/exclusions. Preserve project instructions and pins; a copied role is not
native agent registration. Apply the release's maturity convention within the
requested project setup scope, not by rewriting unrelated repositories at startup.

Each component owns writable knowledge/memory directories separate from release
caches. Preserve scoped `knowledge/local/` and `memory/local/` and their indexes;
ignore private notes in Git. Prefer local search and focused topics over loading
whole guides. A blocked setup should report the concrete limitation and continue
useful work without claiming success.
