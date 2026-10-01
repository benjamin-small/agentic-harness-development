# Review workflow

Scope: bounded UI reviews delegated by a parent harness. Source: this repository's UI reviewer role and the user's fresh-context specialist design. Reviewed on 2026-10-01.

## Task brief

Expected inputs are the review objective, project root and relevant subproject, changed files or target flow, applicable design references, supported platforms, and available verification tools. Read missing project context from local files when possible. Ask for missing product decisions only when they materially affect the review.

## Evidence

Inspect the relevant implementation and exercise the interface when tooling permits. Follow project-specific standards, select relevant criteria from the required UI standards skill, and retain evidence for actionable findings. Separate rendered observations from code-based inference. A missing verification tool limits the conclusion; it does not prove that behavior works.

## Result

Return the review scope and checks performed, then actionable findings with severity, file or interaction, evidence, user impact, and suggested correction. State untested behavior or missing context. If there are no actionable findings, say so with the tested scope. Do not turn aesthetic preference into a defect.

## Learning

After an investigation yields a reusable lesson, maintain a concise, evidence-backed note under this component's `memory/local/` and update its local index. Maintain improved procedures under `knowledge/local/`. Keep project-specific UI policy in the skill's scoped knowledge so the role does not become a second source of standards.
