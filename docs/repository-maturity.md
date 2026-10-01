# Repository maturity

**Tinker → Alpha → Beta → Stable** describes how ready a project's current,
advertised capabilities are for others to rely on. Every project adopting this
guidance must put a linked maturity badge directly below the title in its primary
README, before the introduction. Link it to this guide so readers can understand
the scale. Use the same treatment for independently maintained projects in a
monorepo; supporting documentation pages do not need their own badges.

Maturity is a maintainer's assessment backed by evidence. A timestamp version,
passing CI, or a published release alone does not establish a stage. State the
current stage and its main limitation or evidence in the README's status section.
Stage names describe this shared convention, not an external certification.

## The scale

| Stage                 | What readers can expect                                                                                   | Evidence for choosing it                                                                                                  |
| --------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **[Tinker](#tinker)** | An experiment to explore an idea. Expect incomplete workflows and frequent changes in direction.          | The purpose, what can be tried, and known gaps are explained.                                                             |
| **[Alpha](#alpha)**   | A usable core for early adopters who can tolerate rough edges and significant changes.                    | The core works; setup and limitations are documented; important behavior has repeatable checks.                           |
| **[Beta](#beta)**     | The intended core workflows are complete and being validated in realistic use.                            | Supported integrations and end-to-end workflows have evidence; upgrades and known issues are documented.                  |
| **[Stable](#stable)** | Dependable use within the documented support boundary, with deliberate maintenance and change management. | Sustained real use, repeatable validation, support ownership, and practiced upgrade/recovery procedures where applicable. |

### Tinker

The project is exploring feasibility or direction. It may contain sketches,
prototypes, or partial implementations. Setup can be manual and interfaces can
change freely. Readers should treat it as an experiment; no downstream reliance
is promised. Remaining here is a valid choice for a personal experiment.

### Alpha

The core delivers something useful and can be set up from the documentation.
Automated tests or equivalent repeatable checks cover important behavior. Some
integrations, installation paths, or workflows can remain incomplete or verified
only with mocks. Clearly identify those gaps and expect substantial changes.

This repository is currently **Alpha**: its TypeScript tools and published
packages have repeatable tests and consumer verification, while live Jev
inference and interactive harness integration still have verification gaps. See
the [current status](../README.md#current-status) and [testing record](testing.md).

### Beta

The advertised core scope is complete, including the integrations needed to use
it. Main workflows have been exercised end to end in the supported environment,
with real users or representative real workloads. Installation, configuration,
upgrades, and known issues are documented. Breaking changes remain possible but
come with a clear explanation and migration path. Mock-only proof of a required
external integration is insufficient.

### Stable

The documented capabilities have demonstrated reliable use over time. Supported
environments and interfaces are clear; maintainers have a support and security
reporting path, useful regression checks, and a documented compatibility policy.
Projects with persistent data or deployments have exercised applicable upgrade,
backup, rollback, and recovery procedures. Significant behavior changes are
announced with migration guidance.

Stable does not mean feature-complete forever, bug-free, or universally suitable
for production. Apply the claim only to the supported scope. A roadmap can still
contain new features, and experimental optional features should be labeled locally.

## Add a badge

Use these repository-owned SVGs; the highlighted stage and accessible text convey
the selection as well as its color. No badge service or runtime script is needed.

| Stage  | Preview                                                               |
| ------ | --------------------------------------------------------------------- |
| Tinker | [![Repository maturity: Tinker](badges/maturity-tinker.svg)](#tinker) |
| Alpha  | [![Repository maturity: Alpha](badges/maturity-alpha.svg)](#alpha)    |
| Beta   | [![Repository maturity: Beta](badges/maturity-beta.svg)](#beta)       |
| Stable | [![Repository maturity: Stable](badges/maturity-stable.svg)](#stable) |

Copy the appropriate Markdown below the project's `# Title`. These absolute
links work in other repositories. Replace `alpha` in both URLs and `Alpha` in the
alt text when selecting another stage:

```markdown
[![Repository maturity: Alpha](https://raw.githubusercontent.com/benjamin-small/agentic-harness-development/main/docs/badges/maturity-alpha.svg)](https://github.com/benjamin-small/agentic-harness-development/blob/main/docs/repository-maturity.md#alpha)
```

Then add a short status explanation, for example:

```markdown
**Maturity: Alpha.** The core CLI is usable and tested; hosted deployment and
upgrade recovery still need validation.
```

Inside this guidance repository, use relative paths:

```markdown
[![Repository maturity: Alpha](docs/badges/maturity-alpha.svg)](docs/repository-maturity.md#alpha)
```

For offline documentation, copy the chosen SVG into the consuming project and
use a local image path, retaining the link to this guide. To pin the artwork and
definitions, replace `main` in both absolute URLs with the same verified commit
SHA or a release tag that actually contains these files. Do not point at a release
that predates the maturity guide.

## Maintain the assessment

- Choose the highest stage whose criteria are supported by evidence for the
  advertised core. If uncertain, use the earlier stage and explain the gap.
- Review the badge when bootstrapping a project, preparing a release, or changing
  its supported scope. Do not promote based on age, download counts, test coverage
  percentages, release numbering, or a successful build alone.
- Keep the badge, alt text, link anchor, and status explanation in agreement.
  Log promotions and regressions as significant changes in the same pull request,
  with evidence, remaining limitations, and migration actions when relevant.
- A project may move back to an earlier stage if its core is being reworked or
  the previous claim is no longer supported. Document the reason.
- Maturity and maintenance activity are separate. An archived or unmaintained
  project should state that prominently even if its last supported version was
  Stable. Never infer continuing support from its maturity badge.

Harnesses applying this standard should inspect the README, tests, release and
integration evidence, and known limitations, then choose and explain a stage.
Preserve an existing justified choice unless new evidence warrants a change.
Adding the badge is a documentation edit; it does not authorize deployment,
installation, or changes to unrelated repositories.
