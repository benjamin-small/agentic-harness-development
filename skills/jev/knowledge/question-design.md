# Question design

## State and independence

Supply only the context necessary to judge the question. State can be text or structured data; instructions should identify relevant fields when there are several. Question map keys correlate answers but are not a substitute for instructions. Questions in one request cannot read each other's answers. For a dependent decision, submit a follow-up request containing the relevant earlier result.

Sources: [State](https://docs.typesafe.ai/concepts/state), [Fan-out](https://docs.typesafe.ai/patterns/fan-out).

## Primitives

- **Choice:** select among explicit, distinct alternatives. Give criteria that separate adjacent options. Include an abstention or “none applies” option when the real workflow permits one. The selected option does not include a generated explanation.
- **Score:** define an ordered rubric with concrete descriptions of each level. Use a short scale, usually 2–10 levels. The result is a probability-weighted position on the scale; labels such as monetary amounts do not turn it into arithmetic over those amounts.
- **Noul:** evaluate one well-defined proposition, returning a value from zero to one. Specify what counts as true and false. Avoid combining independently variable assertions into one statement.

Sources: [Choice](https://docs.typesafe.ai/primitives/choice), [Score](https://docs.typesafe.ai/primitives/score), [Noul](https://docs.typesafe.ai/primitives/noul).

For a batch, distinguish multiple questions about one state from many independent requests about different states. Keep each request's IDs stable so results and errors can be correlated.
