# Review workflow

Scope: bounded UI reviews delegated by a parent harness. Source: this repository's UI reviewer role and the user's fresh-context specialist design. Reviewed on 2026-10-01.

Jev integration reviewed 2026-10-03 against the repository skill and runtime.

## Task brief

Expected inputs are the review objective, project root and relevant subproject, changed files or target flow, applicable design references, supported platforms, and available verification tools. Read missing project context from local files when possible. Ask for missing product decisions only when they materially affect the review.

The parent also supplies Jev's absolute skill entrypoint, selected runtime/version or exposed tool names, allowed provider data scope, standing authorization, private temporary/log paths, and command-scoped credential locator and execution permissions (no secrets). A catalog dependency is not execution access. Unavailable Jev does not block independent evidence collection.

## Evidence

Inspect the relevant implementation and exercise the interface when tooling permits. Follow project-specific standards, select relevant criteria from the required UI standards skill, and retain evidence for actionable findings. Separate rendered observations from code-based inference. A missing verification tool limits the conclusion; it does not prove that behavior works.

## Result

Return the review scope and checks performed, then actionable findings with severity, file or interaction, evidence, user impact, and suggested correction. State untested behavior or missing context. If there are no actionable findings, say so with the tested scope. Do not turn aesthetic preference into a defect.

Include `Jev: used | overridden | unavailable | not-needed`. For a call, give its `callId` (or legacy request ID), recipe/model, supplied evidence scope, and how the answer changed the review; record feedback when supported. For unavailable/not-needed, give the specific blocker or deterministic/generative reason. Do not equate model support with live rendered verification.

## Learning

After an investigation yields a reusable lesson, maintain a concise, evidence-backed note under this component's `memory/local/` and update its local index. Maintain improved procedures under `knowledge/local/`. Keep project-specific UI policy in the skill's scoped knowledge so the role does not become a second source of standards.
