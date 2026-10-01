---
name: ui-standards
description: Review web, desktop, or mobile interfaces for consistency, interaction clarity, accessibility, and responsive behavior using the project's existing design system and requirements.
license: MIT
---

# UI standards

Start with the project's product requirements, design tokens, established components, and supported platforms. Preserve those choices unless the task requests a redesign. These are baseline review practices, not a substitute for the owner's specific visual standards.

Use the [knowledge index](knowledge/INDEX.md) and targeted local search to select review criteria relevant to the changed flow. Read those criteria and inspect the implementation plus rendered behavior when tooling is available. Consult the [memory index](memory/INDEX.md) only for applicable observed lessons.

Report concrete findings with the affected interaction, evidence, user impact, and a practical correction. Distinguish observed behavior from code-based inference and untested states. Prioritize problems that block or confuse users over stylistic preferences.

Do not install browser tooling or change unrelated UI merely because this skill is present. State which interactions could not be checked. Use the current project's verification tools when available.

Maintain project-specific standards in this component's scoped `knowledge/local/` and observed lessons in `memory/local/`, updating their local indexes with evidence and dates. Keep shared knowledge curated and avoid mixing one project's private details into another scope.
