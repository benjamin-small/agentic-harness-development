# Bounded decision recipes

Repository recipes, version 1; implemented and reviewed 2026-10-03. Source:
`src/jev/recipes.ts` in the version-matched toolkit. Each recipe builds a standard
Jev request; it adds no endpoint, credential source, or automatic action.
Inputs accept 1–32 unique item IDs and at most 16,000 characters per text field,
subject to the shared 1 MiB request cap. Recipe CLI and MCP calls default to zero
retries. Multiple items share state but cannot consume each other's answers.

## Evidence relevance

Use after a search yields excerpts that need semantic triage, or before a manual
handoff. `jev_evidence_relevance` accepts the following fields plus `dataScope`.
The equivalent CLI command is `jev evidence-relevance --input evidence.json`.

```json
{
  "id": "handoff-1",
  "objective": "Implement guest checkout while preserving billing requirements",
  "items": [
    { "id": "requirements-12", "text": "Guests can pay without an account." },
    { "id": "notes-4", "text": "Launch-region approval is still unresolved." }
  ]
}
```

Answers are `relevant`, `irrelevant`, or `uncertain`. Keep uncertain items and
source references. The host always preserves user requirements, authorization,
open work, and critical constraints regardless of a relevance label. This does
not summarize text, automatically discard history, or hook native compaction.
Measure end-to-end latency and retained evidence before claiming a speedup.

## Finding support

Use when several proposed findings need an independent support check.
`jev_finding_support` accepts these fields plus `dataScope`; CLI:
`jev finding-support --input findings.json`.

```json
{
  "id": "review-1",
  "findings": [
    {
      "id": "null-result",
      "claim": "The function returns an empty string for null input.",
      "evidence": "function normalize(x) { return x == null ? '' : String(x); }"
    }
  ]
}
```

Answers are `supported`, `contradicted`, or `insufficient`. A support label does
not prove a finding is important, reproduce behavior, or authorize a change.
Absence of evidence is not a contradiction. Read the original evidence and
revise or override the answer when warranted.

## Library and feedback

Import `evidenceRelevance` or `findingSupport` and pass its result to
`runRecipe(client, recipe, {signal})`. Builders are local and credential-free;
`runRecipe` performs inference. `result.callId` correlates with persistent logs.
Use `recordJevOutcome({callId, outcome: "used", reason: "accepted"}, logPath)`
after actually using a result. CLI: `jev outcome --input outcome.json`, with the
same object. Use `overridden` with `contrary_evidence` or `uncertain` when appropriate.
An unavailable call may omit `callId` and use `credentials`, `permission`, `network`,
`invalid_result`, or `busy`. Do not include free-text evidence in telemetry.

MCP feedback accepts IDs issued by that server session and consumes an ID once;
feedback after a restart uses the library/CLI. Library/CLI records are caller
assertions and do not verify historic call existence. Old runtimes lack recipes,
feedback and returned call IDs: continue using `decide` and report outcomes in
the review until an explicitly selected newer runtime is installed.
