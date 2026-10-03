---
name: poietic-harness-update
description: Check Poietic Harness toolkit version alignment or update its installed skills and runtime to an exact GitHub release. Use for poietic-harness:update, startup version mismatches, or requests to upgrade this guidance repository. Preserves project pins and scoped local expertise.
license: MIT
compatibility: Version checks require Node.js 24 or 26. Release acquisition uses GitHub access and a checksum tool. Native namespaced invocation and automatic startup hooks require the bundled Claude Code plugin.
metadata:
  invocation: "poietic-harness:update"
---

# Poietic Harness update

Check before changing anything. A session-start check reports version alignment;
it does not authorize an upgrade or a change to a project/deployment pin.
An explicit update request authorizes work within its stated scope.

Routine version polling should invoke the deterministic maintenance executable
directly, without an agent turn. Use [checking guidance](knowledge/checking.md)
for the available command, cache/exit semantics, and host network permissions.

1. Locate the active installation and project root from the invoking harness's
   configured paths. Read [the knowledge index](knowledge/INDEX.md), then only
   the topic needed. Do not assume the current directory is the toolkit.
2. Run the [read-only check](knowledge/checking.md). Distinguish a pinned version
   mismatch from availability of a newer release and from an unavailable check.
3. For an update request, follow [the scoped update procedure](knowledge/updating.md).
   Inspect the target changelog, verify release artifacts, stage separately,
   preserve local edits and knowledge/memory, then switch the intended consumer.
   Keep the prior version available for rollback.
4. Recheck the actual installed consumer and report version, scope, destinations,
   integrity verification, and any required session restart or unresolved conflict.

Search this component with `rg` before loading more context. Maintain this skill's
own writable `knowledge/local/` and `memory/local/` under its user, project, or
deployment working copy. Never write learned state into an immutable release or
plugin cache. Consult [memory](memory/INDEX.md) for reviewed lessons; record only
observed, scoped lessons with evidence and dates.
