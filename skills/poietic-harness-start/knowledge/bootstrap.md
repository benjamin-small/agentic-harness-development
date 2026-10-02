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
4. Validate the installed catalog/runtime locally, verify native skill discovery,
   and perform the [routine checks](checking.md). Report release, scope, paths,
   results, and any reload needed. No credentials or paid inference are needed.

In the global AGENTS.md, keep only:

> At session start, run $poietic-harness-start. Initial user-scope setup is authorized.

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
