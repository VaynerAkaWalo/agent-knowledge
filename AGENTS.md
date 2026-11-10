# agent-knowledge

Keep one fact per file in `facts/`. A fact records what an agent cannot learn from the source, such as a decision and its reason or where the authoritative information lives. Leave out copied implementation details that will go stale.

Use a kebab-case filename ending in `.md`, a single-line `description` and a body of at most 600 characters. Optional `sources` entries use `owner/repo` or `owner/repo/path`.

```markdown
---
description: Shared decisions belong in this knowledge base
sources:
  - example/project
---
Record decisions that span repositories here so agents can find their rationale without relying on an old conversation. Keep implementation details in the source repository.
```

Agents read every description at the start of a task, so describe the fact itself. Update or delete an existing fact when it changes rather than adding a contradiction.

Never store secret values, keys or tokens. Record only where they are managed. Check visibility before adding private facts to a public repository.

Validate with `bun run lint`, `bun run typecheck` and `bun test`. Open pull requests and do not merge them.
