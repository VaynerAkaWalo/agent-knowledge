# agent-knowledge

Keep one fact per file in `facts/`. A fact compresses what an agent needs for most tasks in one area, taken from the owner's repos, docs and AGENTS.md files or from the owner's own rules, and its sources say where to read the rest. Leave details like versions, lists of services or step-by-step commands to the source, because the copy goes stale and the source doesn't. Write a rule as what to do and why, plus what to do when it doesn't fit, instead of listing what not to do.

Use a kebab-case filename ending in `.md`, a single-line `description` of at most 120 characters and a body of at most 600 characters. Optional `sources` entries use `owner/repo` or `owner/repo/path`.

```markdown
---
description: One line naming the tasks the fact helps with
sources:
  - example/project/docs/ARCHITECTURE.md
---
A few sentences.
```

Agents read every description to decide which facts to open, so the description says which tasks should lead an agent to the fact, in the words those tasks use. Add a term only if a task that needs the fact wouldn't match without it, keep rules, exceptions and conclusions in the body, and make sure the body answers everything the description promises. The file name is the slug. `sources` is optional and lists the `owner/repo` or `owner/repo/path` entries the fact relies on.

Never write secret values, keys or tokens, only where they live and how to get them. Check visibility before adding private facts to a public repository.

When a fact changes, edit or delete its file instead of adding one that contradicts it.

Before writing a fact, name the decision an agent faces when it applies and make sure the fact answers it first. Check every claim against its source on the default branch on origin, and keep a claim's qualifications when you reword it. Write the owner's rules as rules and observed state as observations, and ask the owner instead of turning one app's behavior into a rule.

Every change is reviewed as [REVIEW.md](REVIEW.md) describes, so read it before opening a PR, and pass it to the reviewer along with this file.

Validate with `bun run lint`, `bun run typecheck` and `bun test`.

Open pull requests. Do not merge them.
