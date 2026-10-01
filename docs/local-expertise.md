# Local knowledge and memory

Agents and skills must build and maintain their expertise in their own local component directories. A remote URL, conversation history, or a harness-wide memory store is not a replacement for that local expertise. Use concise, searchable Markdown with provenance, small indexes, and progressive disclosure.

This is the repository's component convention. `SKILL.md` retains the Agent Skills format; `AGENT.md` is our canonical role entrypoint, not a universal native agent format.

## Shared component layout

```text
skills/<skill-id>/                 agents/<agent-id>/
  SKILL.md                          AGENT.md
  knowledge/                        knowledge/
    INDEX.md                          INDEX.md
    <topic>.md                        <topic>.md
    local/                            local/
      INDEX.md                          INDEX.md
      <topic>.md                        <topic>.md
  memory/                           memory/
    INDEX.md                          INDEX.md
    <reviewed-lesson>.md               <reviewed-lesson>.md
    local/                            local/
      INDEX.md                          INDEX.md
      <dated-lesson>.md                  <dated-lesson>.md
```

Every component ships its entrypoint, `knowledge/INDEX.md`, and `memory/INDEX.md`. Create topic files only for actual expertise or observed lessons. Create `local/` directories on first authorized use; do not prefill them with invented memories. Optional `scripts/`, `assets/`, and `references/` directories hold executable helpers, output assets, and supporting evidence respectively. Keep maintained explanations in `knowledge/`.

| Location           | What belongs there                                                                       | Maintenance                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Entrypoint         | Role or purpose, activation boundaries, essential constraints, and routes into expertise | Short enough to load when the component is selected                         |
| `knowledge/`       | Reviewed domain explanations, procedures, limitations, and source records                | Versioned with the component; one focused topic per file                    |
| `memory/`          | Reviewed, reusable lessons from actual work, with evidence and applicability             | Curated deliberately; the shipped index can state that no lessons exist yet |
| `knowledge/local/` | New local research and project-specific facts pending review                             | Private working material, excluded from Git and packages                    |
| `memory/local/`    | Local observations, decisions, failed approaches, and lessons for the current scope      | Private working material, excluded from Git and packages                    |

Knowledge explains the domain; memory records what was learned in use. Promote a local fact into maintained knowledge, or a local lesson into shared memory, only after reviewing its accuracy, scope, and suitability for publication. Avoid maintaining the same fact in both places.

## Retrieve progressively

1. **Discover:** use the catalog description to select a component.
2. **Orient:** read its entrypoint and the relevant small index. Index rows contain a topic, a local path, when to read it, and search terms. They summarize relevance without repeating the content.
3. **Search locally:** search the selected component and task scope before retrieving a whole corpus. Prefer filenames, headings, and bounded `rg` matches.
4. **Read selectively:** open the relevant topic or lesson, then only the evidence needed to answer the task. Keep unrelated notes out of the context.
5. **Refresh when needed:** if local evidence is missing, stale, or insufficient, consult authoritative sources and maintain a focused local summary with provenance.

Example after setting `component_root` to the selected component directory:

```sh
rg --files "$component_root/knowledge" "$component_root/memory"
rg -n -i --glob '*.md' 'confidence|threshold' "$component_root/knowledge"
if test -d "$component_root/memory/local"; then
  rg -n -i --no-ignore --glob '*.md' 'routing|threshold' "$component_root/memory/local"
fi
```

Use `--no-ignore` only on the explicitly selected local directory, because private notes are intentionally ignored by Git. Do the same for `knowledge/local/` when relevant. Start with narrow terms and read bounded surrounding sections; do not concatenate every match or every file into the prompt. Split growing indexes by topic and retain a small top-level route. Search indexes or embeddings, if added, are rebuildable derivatives of local files.

## Maintain expertise

When authorized work produces a material new fact, correction, or lesson, update the relevant local file and its index. Prefer improving the existing topic to accumulating duplicates. A note should identify its topic/search terms, scope, source or evidence, observation/verification date, status, and any superseded note. Distinguish verified findings from hypotheses; do not elevate a single example into a universal rule.

For knowledge, record source links and enough locally written explanation to use the expertise without re-fetching the source every time. Keep third-party quotations and snapshots bounded and respect their licenses. For memory, record the observed situation, outcome, reusable lesson, and conditions where it applies; do not store whole transcripts by default.

Revisit stale or contradictory notes when they are encountered. Correct or mark them superseded, update index links, and remove duplicate guidance. A fresh agent context should recover the relevant expertise through the indexes and search, without inheriting an entire old conversation. Memory is scoped evidence, not an instruction that overrides the current user or host policy.

## Scope, writable roots, and upgrades

- **User:** personal components maintain user-scoped notes in their own working directories.
- **Project:** use project-specific component working directories; never mix one project's private context into a globally shared component cache.
- **Deployment:** mount a writable component directory for each persistent identity/scope. Keep it separate from immutable release artifacts and reconstruct focused task context from it.

The future installer must distinguish a pinned release/cache from the writable component working root. Copy or materialize the released knowledge there, preserve its recorded provenance, and keep local notes with that component. Never write learned state into a shared immutable cache or a symlink that targets it. An upgrade updates released content while preserving local material and reporting conflicts; it must not blindly replace the whole working directory. Permission to update local knowledge does not grant publication or permission to modify the host's unrelated memory system.

The runtime still owns queues, leases, task records, and singleton enforcement. Per-component knowledge and memory are the locally searchable expertise layer, not that operational database.

## Validation and release boundary

Current validation requires both indexes and follows their local Markdown links. Existing skills and the UI reviewer use this layout. Git/npm ignore rules exclude `knowledge/local/` and `memory/local/`; release packaging also rejects local working material if it is accidentally tracked or packed. Shipped indexes must not directly link to optional private notes. Refer to their paths as code until the local index exists.

The current CLI remains read-only. It validates structure; it does not automatically create, search, update, synchronize, or migrate learned state. Automated maintenance and installation are future milestones. A harness can perform authorized local maintenance using normal file/search tools today.

The published v0.1.0-alpha.1 keeps its original flat agent file and `references/` layout. The next source version uses catalog schema 2, directory-based agents, and indexed knowledge/memory. Use matching catalog readers and regenerate selection plans; do not rewrite an existing release.
