# Jev model selection

Applicability: the unreleased Jev 1.14 toolkit source update. Verified 2026-11-13.

`src/types.ts` requests OpenRouter model `typesafe/jev-1.14`; validation accepts only that exact alias or `typesafe/jev-1.14-20261014`, preserving the returned value. Old 1.13 IDs, fabricated revisions, prefixes and the floating latest alias are rejected. Adding future revisions requires explicit contract review and regression evidence.

Provenance: [OpenRouter provider metadata](https://openrouter.ai/api/v1/models/typesafe/jev-1.14/endpoints) names that alias and dated endpoint; [OpenRouter guidance](https://openrouter.ai/docs/guides/community/jev) routes it through the same [Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request). The 2026-11-13 synthetic CLI response independently returned the dated revision; see [verification](../../../docs/verification/jev-1.14-2026-11-13.md). `GET /api/v1/models` is the chat-model catalog and did not list this decision model during verification; use the specific endpoint metadata instead.

The native TypeSafe ID `jev-1.14.0` belongs to its distinct API contract. Do not substitute it into OpenRouter requests. Keep this toolkit's existing bounded JSON state, choice/score/noul types and transport. The model upgrade does not add image assets, Box or long-context controls. Model quality and operational thresholds require separate representative evaluation.
