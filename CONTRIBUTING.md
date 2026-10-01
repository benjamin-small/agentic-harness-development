# Contributing

Use Node.js 24 LTS (or the tested Node.js 26 line), npm, and Git.

```sh
npm ci
npm run format
npm run check
```

Open a pull request with the problem, resulting behavior, and relevant validation. Focus tests on observable behavior: malformed inputs, dependency selection, partial failures, and consumer compatibility. Avoid tests that only mirror instruction wording.

Every project's primary README should display a linked maturity badge below its title. Follow the [shared maturity scale](docs/repository-maturity.md), keep the stage and status explanation consistent, and support promotions or regressions with evidence and a changelog entry. A release or passing CI alone does not justify promotion.

For skills and agents, follow [the local expertise convention](docs/local-expertise.md): a component directory with a small entrypoint, indexed knowledge, and indexed memory. Preserve the Agent Skills format, use precise descriptions, and put conditional detail in linked topic files. Record authoritative sources, verification dates, and lesson applicability. Search locally and load only relevant material. Do not copy entire third-party manuals or commit private local notes. UI standards should respect the consuming project's design system and requirements.

For tools, put reusable logic in the TypeScript library. Commands must keep machine-readable output on stdout and diagnostics on stderr. Maintain source and package version alignment.

Every significant addition, fix, removal, or behavior change must update [CHANGELOG.md](CHANGELOG.md) in the same pull request. Follow [the changelog policy](docs/changelog.md) for stable Markdown headings, component names, readable impact, migration actions, and verification limits. This applies to skill and agent instructions as well as code. Put unpublished changes under `Unreleased`. For minor changes with no consumer or maintainer impact, explain briefly in the pull request why no entry is needed.

The bootstrap milestone is tracked in [the implementation plan](docs/implementation-plan.md). The release procedure is in [docs/releases.md](docs/releases.md). Native harness behavior and paid API calls need separate, explicit validation records.
