# Sources and maintenance

These are focused summaries of upstream documentation, initially checked on 2026-10-01. Model selection and the existing transport were rechecked on 2026-11-13 for Jev 1.14; dated 1.13 limitations remain historical evidence. The summaries are maintained here; the upstream manuals are not bundled or re-licensed by this project.

| Topic                       | Authoritative source                                                                                    |
| --------------------------- | ------------------------------------------------------------------------------------------------------- |
| Harness fit                 | [TypeSafe: Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents)                 |
| State                       | [TypeSafe: State](https://docs.typesafe.ai/concepts/state)                                              |
| Question primitives         | [TypeSafe: Primitives](https://docs.typesafe.ai/primitives)                                             |
| Confidence                  | [TypeSafe: Confidence](https://docs.typesafe.ai/confidence)                                             |
| Historical 1.13 limitations | [TypeSafe: Jev 1.13](https://docs.typesafe.ai/model-jaggedness/jev-1.13)                                |
| Skill routing               | [TypeSafe: Skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion)                       |
| OpenRouter transport        | [Decisions API](https://openrouter.ai/docs/api/api-reference/alphadecisions/submit-a-decisions-request) |
| Model availability          | [OpenRouter: Jev](https://openrouter.ai/docs/guides/community/jev)                                      |

When updating, compare the transport schema and primitive semantics, revise only affected references, record the new verification date, and add fixtures for changed wire behavior when the runtime exists. Prefer TypeSafe's confidence definition over informal cookbook shorthand. Do not embed volatile prices or claim that a “latest” model alias is reproducible.

Current model metadata: [OpenRouter Jev 1.14 endpoints](https://openrouter.ai/api/v1/models/typesafe/jev-1.14/endpoints), identifying `typesafe/jev-1.14` and provider revision `typesafe/jev-1.14-20261014`. The toolkit continues to expose the existing JSON choice/score/noul contract.
