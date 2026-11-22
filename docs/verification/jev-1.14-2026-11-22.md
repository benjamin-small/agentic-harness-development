# Jev 1.14 model pin — 2026-11-22

**Verified: real OpenRouter inference against `typesafe/jev-1.14` through the
source-built library and CLI, with three typed questions on synthetic state.**
This record covers the model-pin change only. It is not an accuracy benchmark.

## Why

TypeSafe released Jev 1.14 on 2026-10-14 ([changelog](https://docs.typesafe.ai/changelog)),
and the [OpenRouter Jev guide](https://openrouter.ai/docs/guides/community/jev), read on
2026-11-22, names `typesafe/jev-1.14` and `~typesafe/jev-latest` as the current IDs. Every toolkit release through
v2026.1014.21134 hard-codes `typesafe/jev-1.13`, so installed runtimes kept calling 1.13.

## Upstream contract (read 2026-11-22)

- Changelog for 1.14: model ID `jev-1.14.0`, better multilingual support, and a new
  Box question type for images (1.14 only). Image input and long context also work
  on 1.13. TypeSafe labels Box and image input as early features that may change.
- OpenRouter's Decisions API reference shows no change to the `choice`, `score` or
  `noul` request/response contract. Only part of that page was read verbatim
  (about 40k of 66k characters); the rest relied on a summary.
- No 1.14 limitations page exists (`docs.typesafe.ai/model-jaggedness/jev-1.14` is a 404).
  The 1.13 page is still the only published limitations guidance.
- No deprecation or end date is published for 1.13.
- The dated revision `typesafe/jev-1.14-20261014` comes from live responses only. It
  is not in the upstream docs.

## Change

- `JEV_MODEL` is now `typesafe/jev-1.14` and `JEV_MODEL_REVISION` is
  `typesafe/jev-1.14-20261014`. Validation still accepts exactly the alias and that
  one revision. It now rejects the 1.13 alias and revision, unknown 1.14 revisions,
  and suffixed IDs; the regressions in `tools/jev/test/jev.test.ts` cover these.
- Box questions are not added. A `type: "box"` question is still a validation error.

## Live checks

Run against the source build of this branch (package version still
2026.1014.21134 before stamping), synthetic state only, retries disabled, with the
call log redirected to a temporary file inside the checkout and deleted afterwards.

| Check                                                                    | Time (UTC)          | Attempts | Resolved model               | Answers                      | Cost (USD) |
| ------------------------------------------------------------------------ | ------------------- | -------- | ---------------------------- | ---------------------------- | ---------- |
| `JEV_LIVE_SMOKE=1 tools/jev/scripts/smoke.mjs`, library                  | 2026-11-22 14:36:50 | 1        | `typesafe/jev-1.14-20261014` | payments, score 2, noul 0.98 | 0.0000198  |
| same script, CLI channel                                                 | 2026-11-22 14:36:51 | 1        | `typesafe/jev-1.14-20261014` | payments, score 2, noul 0.98 | 0.0000198  |
| `tools/jev/dist/src/cli.js decide` on a three-question synthetic fixture | 2026-11-22 14:36:52 | 1        | `typesafe/jev-1.14-20261014` | payments, score 2, noul 0.96 | 0.0000166  |

There was also one earlier direct HTTP request at 2026-11-22 14:35 UTC that found the
revision ID; it returned the same answers (noul 0.95).

## Limits

- One synthetic scenario. This says nothing about 1.14's decision quality compared
  with 1.13's.
- Consumers stay on 1.13 until they install a release that contains this change and
  update their pin. Skill text alone does not change the runtime.
