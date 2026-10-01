# Harness patterns

Use Jev for narrow decisions inside a larger harness workflow: routing to known specialists, classifying incoming work, scoring candidate evidence, or checking a bounded proposition. The main harness remains responsible for orchestration and generative work.

Source: [Jev with coding agents](https://docs.typesafe.ai/introduction/coding-agents).

For a large skill catalog, first rank short descriptions, then evaluate a small candidate set using the fuller relevant descriptions. Allow all candidates to be rejected. This keeps initial context small while giving the final selection enough evidence. Treat the result as a suggestion to the host, and validate relevance with the actual task.

Source: [TypeSafe skill suggestion](https://docs.typesafe.ai/cookbooks/skill_suggestion).

Examples in this repository's intended architecture:

- A project manager may classify a ticket among configured specialists, then create a bounded task brief.
- A UI reviewer may score a set of observations against a clearly defined rubric.
- A harness may rank skill candidates before loading the selected references.

Exact file discovery and explicit project include/exclude choices belong in deterministic bootstrap code. Jev does not override those choices or the host's tool permissions. Keep uncertain classifications and unavailable inference visible instead of silently choosing a high-impact action.
