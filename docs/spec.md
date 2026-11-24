# Knowledge base

The knowledge base is a vault of facts, docs, specs and notes about the owner's projects, built up over time. Agents query it on demand through a local CLI, `kb`. Each repo can have a preset, a list of documents whose descriptions an agent sees when a conversation starts in that repo.

## Vault

Every document in the knowledge base lives under `vault/`, in any folder structure. Files outside `vault/`, like this spec, are not documents. You open `vault/` in Obsidian as the vault, so scripts, presets and `node_modules` stay out of it.

A document's slug is its file name without `.md`. Slugs are kebab-case and unique across the whole vault, so a document keeps its address when it moves between folders.

Every document starts with YAML frontmatter holding `kind`, `trust` and `description`, plus optional `sources`. A note leaves out `trust` and adds `created`, and specs add the keys described under Kinds. Lint fails on any other key, on `trust` in a note, on `created` outside a note, and on spec keys in any kind but a spec.

- `kind` is `fact`, `doc`, `spec` or `note`, described under Kinds.
- `trust` is `reliable` or `reference`, described under Trust.
- `description` is one line of at most 120 characters that names the tasks the document helps with, in the words those tasks use. Search and presets show it, so it decides whether an agent opens the document.
- `sources` lists the `owner/repo` or `owner/repo/path` entries in other repos that the document relies on.

## Trust

An agent may act on a `reliable` document without checking it. It treats a `reference` document as a starting point and verifies the claims it relies on against the document's sources before acting on them. When a `reference` document has no sources, the agent asks the owner instead, since a fact, doc or spec without sources records one of the owner's rules.

Only the owner marks a document `reliable`. Agents add documents as `reference`. A note is always `reference`, and `kb` shows it as such. An agent that finds a fact or doc wrong or stale proposes a fix, and a fix to a reliable one also downgrades it to `reference`. Lint can't tell who wrote a change, so PR review enforces this.

## Links

Documents link to each other with `[[slug]]`, which `kb` and Obsidian both resolve. A link written as a path inside the vault, like `[[docs/caching]]`, resolves to the document at that path. Lint fails on a link to a slug that doesn't exist and on two documents with the same slug. Files in other repos are referenced through `sources`.

## Kinds

A fact compresses what an agent needs for most tasks in one area, taken from the owner's repo docs or the owner's own rules, and its sources say where to read the rest. Its body stays under 600 characters and leaves details like versions, lists of services or step-by-step commands to the sources, because a copy goes stale and the source doesn't. It states a rule as what to do and why, plus what to do when the rule doesn't fit.

A doc is living reference material that is allowed to restate its sources, like how one service caches its responses, so an agent working on another service can find and reuse the approach. It has no length limit and gets fixed when it disagrees with its sources. A doc's frontmatter looks like this.

```markdown
---
kind: doc
trust: reference
description: Adding or changing response caching in Shop, or in another service that should cache the same way
sources:
  - Example-Org/shop
---
```

A spec records what was intended when a feature was built, so a bug found years later can be traced to the original design, the first implementation or a later change. It has no length limit and adds these keys.

- `status` is `draft`, `implemented` or `superseded`.
- `implemented_in` lists the pull requests that built it as `owner/repo#number`, required once the status is `implemented`.
- `superseded_by` is the quoted `"[[slug]]"` of the spec that replaced it, required once the status is `superseded`. Unquoted, YAML reads `[[slug]]` as a nested list.

Once a spec is implemented, its description and body stay as written, and only `status`, `implemented_in` and `superseded_by` change. Code drifting from a spec doesn't make the spec wrong. An agent that finds current behavior differs from a spec describes the current behavior in a doc. A spec's frontmatter looks like this.

```markdown
---
kind: spec
trust: reference
description: Tracing why Shop's response caching behaves as it does back to its original design
status: implemented
implemented_in:
  - Example-Org/shop#7
sources:
  - Example-Org/shop
---
```

A note records thinking at one point in time, like the triage of an issue with a proposed solution, or the breakdown of a feature into the work it needs. It has no length limit and no structure beyond its frontmatter. Its `created` key holds the date it was written as `YYYY-MM-DD`. A note isn't fixed when it goes stale, since it records what was thought on that date. A note links to what came out of it, like a feature breakdown linking `[[slug]]` to each spec it was split into. A note's frontmatter looks like this.

```markdown
---
kind: note
description: Investigating slow checkouts in Shop, with the triage and the fix proposed for them
created: 2026-02-10
sources:
  - Example-Org/shop
---
```

## Presets

`presets/all.md` applies in every repo, and `presets/<owner>/<repo>.md` applies in one repo. Every non-empty line of a preset is one `[[slug]]`, and lint fails on a slug that doesn't exist.

```markdown
[[releasing]]
[[service-map]]
```

## kb

`bun run install-skills` writes a `kb` launcher running from this checkout into `~/.local/bin`, or `KB_BIN_DIR` when set, and warns when that directory is not on the PATH. `kb` reads the checkout as it is, so the skills tell agents to pull first.

`kb start` finds `owner/repo` from the origin remote of the current directory's git repo, reading the `.git` directory's config instead of running git. It prints the slug, trust and description of every document in `presets/all.md` and then in that repo's preset, each document once. Outside a git repo, or in one without an origin remote or a preset, it prints only `presets/all.md`.

`kb search <query> [--kind <kind>]` ranks documents with BM25 over slug, description and body, building the index in memory on each call. A match in the slug or description counts more than one in the body, since the description names the tasks that should find the document. The implementation picks the weights. It prints the top 10 hits with slug, kind, trust and description, plus a note's `created` date.

`kb read <slug>` prints a header with the slug, kind, trust, description, sources, any spec keys and a note's `created` date, then the body. For a `reference` document the header ends with the instruction from Trust: verify claims against the sources, or ask the owner when there are none. For a fact or doc it adds to propose a fix when the document is stale. For an implemented spec, whatever its trust, it adds that the spec records intent when the feature was built and the code may have changed since. For a note it adds that the note records thinking on its `created` date.

`kb links <slug>` prints the slugs the document links to, the slugs that link to it, and its sources.

A slug that doesn't exist makes `kb read` and `kb links` exit non-zero with an error.

## Skills

The `knowledge` skill tells agents to pull and run `kb start` at the start of every task in one of the owner's projects, then use `kb search` and `kb read` when the task needs more. It leaves the trust rules to the header `kb read` prints, so they reach an agent only with the document they apply to.

The `knowledge-ingest` skill covers all four kinds, chooses the kind from the content, and adds facts, docs and specs as `reference`.

## Later

A retrieval eval, a table of queries and the slugs search must return, comes once there are enough documents to make it meaningful. Embeddings come only if keyword search misses documents in practice.
