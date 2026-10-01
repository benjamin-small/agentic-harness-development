# Review criteria

Apply the relevant subset to the user's task:

- **Intent and hierarchy:** the primary task and next action are clear; labels describe outcomes; grouping follows the user's workflow.
- **Consistency:** reuse established components, tokens, spacing, terminology, and interaction patterns. Identify project-specific rules before suggesting visual changes.
- **Interaction states:** check initial, loading, empty, error, success, disabled, and retry states where the flow can reach them. Preserve user input through recoverable failures.
- **Accessibility:** inspect accessible names, semantic controls, keyboard reachability, focus visibility and restoration, validation feedback, contrast, and motion preferences as applicable. Verify with available tools; do not infer conformance from appearance alone.
- **Layout:** inspect supported viewport sizes, zoom/text expansion, long labels, and content overflow. Include touch targets and platform conventions when relevant.
- **Feedback:** user actions produce timely, understandable status. Destructive or irreversible operations should match the product's established confirmation/recovery behavior.

For each actionable finding, provide severity, location or interaction, reproduction/evidence, consequence, and suggested correction. Include only observed or well-supported findings; list unavailable checks separately. A review with no findings still states its tested scope.

For formal accessibility assessment, consult the project's chosen standard and the current [W3C accessibility guidance](https://www.w3.org/WAI/standards-guidelines/wcag/). This checklist does not certify compliance.
