# Task data and disclosure

Repository policy established from the user's instruction on 2026-10-13. Applies
to request content supplied through the Jev CLI, launcher, library and delegated
workers.

Use the same information-sharing boundary for Jev as for the user's use of the
OpenAI API. Relevant private, confidential or sensitive task context may be sent
when it would be acceptable to send that context to the OpenAI API. Do not reject,
redact or seek separate disclosure approval solely because the destination is
Jev or the context is sensitive. Withhold information that would also be withheld
from the OpenAI API. Explicit user/project restrictions on model-provider
disclosure still apply; include only context relevant to the decision.

This is a rule for choosing request content. Jev requests go through OpenRouter;
the rule does not assert identical provider storage or retention practices.
Authentication credentials belong in the configured credential injection path,
not task state or agent packets. Continue protecting local request files and
keeping credentials and request contents out of activity logs and releases.

## Launcher configuration

For this policy, configure `allowedDataScopes` as `["public", "synthetic", "private"]`.
Use `--data-scope private` for private or sensitive task context. The declaration
describes the request; it does not inspect content or grant external-action
authority. Host execution permissions and paid-inference authorization remain
applicable.

Existing public/synthetic-only configurations require an authorized one-time
addition of `private`; installing updated guidance does not rewrite them. Preserve
paths, pins and explicit operator restrictions. The launcher already
supports `private` in release `2026.1008.162714`; no runtime upgrade is required.
