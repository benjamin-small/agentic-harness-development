# Jev 1.14 update verification — 2026-11-13

This unreleased source update changes OpenRouter model selection from `typesafe/jev-1.13` to `typesafe/jev-1.14` and its explicit accepted response revision to `typesafe/jev-1.14-20261014`. It retains the JSON choice/score/noul interface and rejects old, unknown and suffixed revisions. Image assets, Box and long-context controls are outside the change.

Base: `a425c8ca1c3ef9ca10f3a6b31fd99fef86507b26`. Work is isolated from pending Blog-Review changes. Current version metadata remains the base toolkit version; this is a source candidate, not a published replacement or an installation update.

## Upstream evidence

Verified [OpenRouter model](https://openrouter.ai/typesafe/jev-1.14), [provider endpoints](https://openrouter.ai/api/v1/models/typesafe/jev-1.14/endpoints), [Jev guidance](https://openrouter.ai/docs/guides/community/jev), [Decisions schema](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request) and [TypeSafe models](https://docs.typesafe.ai/models) on 2026-11-13. OpenRouter documents the alias and dated provider revision; native TypeSafe's `jev-1.14.0` is a different transport identifier. Some Decisions examples still use 1.13 and are historical examples.

## Checks

- `npm run check`: 91 tests, formatting, independent typechecks, nine catalog components and embedded manifest validation passed on Node.js 26.10.0/macOS. Coverage: 99.75% lines/statements, 98.93% functions, 97.20% branches.
- The regression checks hardcoded 1.14 request selection, alias/revision preservation, and rejection of old alias/revision, unknown future/suffixed IDs, lookalike prefixes and the floating latest alias.
- Package verification includes the recipe mock's explicit assertion of the 1.14 request ID. `npm run release:pack` and `npm run release:verify` passed for exact source candidate `bf6c683d7622a1c8ea72a59a3acb2fadc8d9e9d1`, including checksums, isolated install, library imports, CLI, batching, recipes, logging/outcomes and embedded-runner paths. Both archives exclude pending Blog-Review.

## Live CLI check

Standing user authorization covered the synthetic task request through `https://openrouter.ai/api/alpha/decisions`. The existing launcher used a temporary path-only configuration/pin and candidate runtime mapping; cached credential access stayed inside the Jev process, with configured metadata-only persistent logs. The personal launcher, installation, pin and configuration were unchanged.

The sandbox initially returned `LOCAL_ACCESS_REQUIRED` before dispatch; the exact command/input was rerun through host permission flow. One inference attempt completed with retries disabled:

- Call ID: `e66b8b08-c079-4be5-aa58-0da535ea7e76`.
- Returned model: `typesafe/jev-1.14-20261014`.
- Synthetic checkout outage: choice `payments`, score `2` on a 0–2 rubric, noul `0.98`.
- Usage: 455 input tokens, 70 output tokens; reported cost 0.00001911 USD.
- Result was used as model-contract validation evidence and recorded as `used` / `accepted`.

This verifies one synthetic CLI/provider path and the shared client, not general model quality, live direct-library invocation, image/Box behavior or native harness compatibility. Automated tests use mock transport.

## Specialist review

Four fresh design contexts returned ready with no findings: Claude Code, Codex, Pi and OpenCode roles under Codex/macOS, launched with `collaboration.spawn_agent` and `fork_turns: none`. Read-only behavior was instructed, not tool-enforced; reviewers did not delegate. All reported Jev not-needed for deterministic design checks. Four new fresh implementation contexts reviewed `bf6c683d7622a1c8ea72a59a3acb2fadc8d9e9d1` and also returned ready with no findings. Codex and Pi independently reran three targeted transport/model-validation tests; all passed. All four reported Jev not-needed for deterministic implementation checks. No unresolved review findings remain. Publication and personal installation updates remain outside this source update.
