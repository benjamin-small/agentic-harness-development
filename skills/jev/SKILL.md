---
name: jev
description: Design and interpret typed Jev decisions for routing, classification, rubric scoring, and bounded checks through OpenRouter. Use for structured harness decisions or Jev integrations.
license: MIT
metadata:
  implementation: guidance-only
---

# Jev decisions

Jev answers typed questions about supplied state. Choose it for a bounded decision with explicit criteria; use the harness's generative model for prose, explanations, and code.

1. Identify the state, decision, and allowed outputs. Keep the state focused on evidence needed for that decision.
2. Choose `choice`, `score`, or `noul`. Read [question design](references/question-design.md) when composing the request. Multiple questions in one call share state and are independent; dependent questions need another call.
3. For OpenRouter integration, read [the API guidance](references/openrouter.md). This foundation release contains guidance only: the reusable TypeScript client and `jev` CLI are planned. Do not imply that those commands are installed or that inference has run.
4. When interpreting results or selecting thresholds, read [confidence and limitations](references/interpretation.md). Model confidence is not a measured probability that a decision is correct.

For skill selection, routing, and advisory checks inside a harness, read [harness patterns](references/harness-patterns.md). The host retains responsibility for authorization and deterministic constraints; a model decision supplies evidence for the workflow.

Use [sources](references/sources.md) when checking upstream changes. Do not load every reference for a single question.
