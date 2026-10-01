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
2. Choose `choice`, `score`, or `noul`. Use the [knowledge index](knowledge/INDEX.md) and targeted local search to find question design, API guidance, or interpretation details. Read only the relevant topic. Multiple questions share state and are independent; dependent questions need another call.
3. This foundation contains guidance only: the reusable TypeScript client and `jev` CLI are planned. Do not imply that those commands are installed or that inference has run.
4. Model confidence is not a measured probability that a decision is correct. Consult the local interpretation topic when selecting thresholds.

The knowledge index also routes skill selection, harness patterns, and upstream sources. The host retains responsibility for authorization and deterministic constraints; a model decision supplies evidence for the workflow.

Check the [memory index](memory/INDEX.md) for applicable observed lessons. Maintain new expertise and lessons in this component's writable, scoped local directories with dates and evidence. Keep indexes current and avoid loading the whole corpus. Shared caches and unrelated host memory are not write targets.
