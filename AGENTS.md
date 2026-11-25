# agent-knowledge

What the owner's agents need to know about the owner's projects, as facts, docs, specs and notes in `vault/`, queried with the `kb` CLI. [docs/spec.md](docs/spec.md) defines the frontmatter, the kinds, trust, presets and `kb`.

A fact compresses what an agent needs for most tasks in one area, taken from the owner's repos, docs and AGENTS.md files or from the owner's own rules, and its sources say where to read the rest. Leave details like versions, lists of services or step-by-step commands to the source, because the copy goes stale and the source doesn't. Write a rule as what to do and why, plus what to do when it doesn't fit, instead of listing what not to do.

```markdown
---
kind: fact
trust: reference
description: One line naming the tasks the fact helps with
sources:
  - example/project/docs/ARCHITECTURE.md
---
A few sentences.
```

A doc holds reference material worth reusing, a spec what a feature is meant to do, and a note a triage, proposal or breakdown at one point in time. Pick the kind by how the document should age: facts and docs stay current, while an implemented spec and a note stay as written.

Agents find documents by their descriptions, through `kb search` and the preset lists `kb start` prints, so the description says which tasks should lead an agent to the document, in the words those tasks use. Add a term only if a task that needs the document wouldn't match without it, keep rules, exceptions and conclusions in the body, and make sure the body answers everything the description promises. The file name is the slug, unique across the vault. Link related documents with `[[slug]]`, and list the `owner/repo` or `owner/repo/path` entries a document relies on in `sources`.

Add a document to a repo's preset in `presets/` only when most tasks in that repo need it, and to `presets/all.md` only when most tasks in every repo do, because its description reaches every conversation there.

Add facts, docs and specs as `reference`. A note leaves out `trust`, since it is always reference, and records the date it was written in `created`. Only the owner marks a document `reliable`, so a fix to a reliable document also downgrades it to `reference`.

Never write secret values, keys or tokens, only where they live and how to get them. Check visibility before adding private knowledge to a public repository.

When a fact or doc changes, edit or delete its file instead of adding one that contradicts it. Once a spec is implemented, change only its `status`, `implemented_in` and `superseded_by`, and describe current behavior in a doc.

Before writing a fact, name the decision an agent faces when it applies and make sure the fact answers it first. Check every claim against its source on the default branch on origin, and keep a claim's qualifications when you reword it. Write the owner's rules as rules and observed state as observations, and ask the owner instead of turning one app's behavior into a rule.

Every change is reviewed as [REVIEW.md](REVIEW.md) describes, so read it before opening a PR, and pass it to the reviewer along with this file.

Each kind's frontmatter fields, allowed values, lengths and required keys are defined in its own file in `scripts/kinds/`.

Validate with `bun run lint`, `bun run typecheck` and `bun test`.

Open pull requests. Do not merge them.
