# OpenRouter resolves the Jev alias to a dated revision

Observed and reviewed: **2026-10-01**. Applies to the toolkit's OpenRouter
Decisions API client, requesting `typesafe/jev-1.13`.

The first live check against v2026.1001.174037 failed with `INVALID_RESPONSE`.
A synthetic diagnostic request showed a valid decision whose model was
`typesafe/jev-1.13-20260917`. Offline validation of the same body with only the
model field replaced by the request alias succeeded, isolating the mismatch.
The dated response ID is also shown in the [official response example](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request).

For v2026.1001.190334, validation accepts the request alias and this explicit
documented revision while preserving the actual returned model. Unknown
revisions, unrelated models, and malformed answers remain errors. Avoid broad
prefix acceptance that would silently admit unreviewed model changes.

After the fix, live library and CLI requests each returned a payments route,
urgency score 2 on a 0–2 rubric, and noul 0.98 for a synthetic payment outage.
Each call used one attempt with retries disabled. See the [dated evidence](../../../docs/verification/jev-2026-10-01.md)
for scope and reproduction. These are fixture observations, not calibrated
accuracy or proof that arbitrary future responses work.

When a new revision appears, inspect the documented and observed contract,
update the explicit acceptance set and regression evidence, and rerun a bounded
authorized check. Do not turn a parser failure into a model decision.
