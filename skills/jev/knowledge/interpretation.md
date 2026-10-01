# Interpretation and limitations

For choice and score, confidence describes how concentrated the answer distribution is. It is not an empirical accuracy percentage. A concentrated distribution can still select the wrong alternative if the criteria or evidence are poor. Inspect the distribution and evaluate decisions on representative labeled cases before picking an operational threshold.

Noul's scalar expresses support for the proposition. Do not manufacture a separate confidence field. For score, interpret the output on the rubric's ordered positions rather than as arithmetic over numeric wording in level descriptions.

Source: [TypeSafe confidence guidance](https://docs.typesafe.ai/confidence).

Jev 1.13 has documented weaknesses around precise numeric/date distinctions, literal interpretations, irrelevant context, and adversarially written state. Equivalent-looking formulations can behave differently. Separately asked propositions do not guarantee algebraic consistency. Use deterministic code for exact arithmetic, identifiers, authorization rules, and checks with an exact answer available locally.

Source: [Jev 1.13 model limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

Return the actual answer and supplied metadata with its request/question IDs. Report malformed responses, unavailable metadata, and failed requests separately. Do not turn an error or abstention into a negative decision, and do not attribute a generated explanation to Jev.
