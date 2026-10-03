---
name: jev
description: Design and interpret typed Jev decisions for routing, classification, rubric scoring, and bounded checks through OpenRouter. Default for suitable bounded structured decisions across tasks and specialist reviews; also use for Jev integrations.
license: MIT
metadata:
  implementation: typescript-library-cli-and-mcp
---

# Jev decisions

Jev answers typed questions about supplied state. Choose it for a bounded decision with explicit criteria; use the harness's generative model for prose, explanations, and code.

For default use and fresh-subagent access, read [harness defaults](knowledge/default-use.md). Availability does not require a call on every task.

1. Identify the state, decision, and allowed outputs. Keep the state focused on evidence needed for that decision.
2. Choose `choice`, `score`, or `noul`. Use the [knowledge index](knowledge/INDEX.md) and targeted local search to find question design, API guidance, or interpretation details. Read only the relevant topic. Multiple questions share state and are independent; dependent questions need another call.
3. Prefer an exposed Jev tool; otherwise follow [tool use](knowledge/tool-use.md) for the pinned CLI or library. Use [recipes](knowledge/recipes.md) to triage excerpts before loading more context (`evidence_relevance`) or check candidate findings against evidence (`finding_support`). Invoke within the host's authorization and parse correlated results. Check availability before claiming inference has run.
4. Model confidence is not a measured probability that a decision is correct. Consult the local interpretation topic when selecting thresholds.
5. Explain how the answer affected the task. Record `used`, `overridden`, or `unavailable` with the returned `callId` through `jev_record_outcome`, `jev outcome`, or the library. These are caller reports, not quality scores. Do not add a call solely to fill a usage quota.

The knowledge index also routes skill selection, harness patterns, and upstream sources. The host retains responsibility for authorization and deterministic constraints; a model decision supplies evidence for the workflow.

Check the [memory index](memory/INDEX.md) for applicable observed lessons. Maintain new expertise and lessons in this component's writable, scoped local directories with dates and evidence. Keep indexes current and avoid loading the whole corpus. Shared caches and unrelated host memory are not write targets.
