# agent-knowledge

A knowledge base for coding agents. Keep the decisions, rationale and context that source code does not explain as facts, docs, specs and notes in an Obsidian-compatible vault, and let agents search it on demand with the `kb` CLI instead of loading everything into every conversation. The template starts with an empty `vault/` and an empty shared preset.

Use GitHub's Use this template button to create your own repository, then clone it. Choose a private repository if your knowledge contains private project information.

```sh
bun install --frozen-lockfile
bun run install-skills
```

The installer writes `knowledge` and `knowledge-ingest` skills for Claude, Codex, Cursor and Grok, pointing at your checkout, and a `kb` launcher in `~/.local/bin`. It replaces existing `SKILL.md` files with those names and any existing `kb` in that directory. Agent homes default to `~/.claude`, `~/.codex`, `~/.cursor` and `~/.grok`. Override them with `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `CURSOR_HOME` and `GROK_HOME` respectively, and the launcher directory with `KB_BIN_DIR`. Run the installer again if you move the checkout. Automatic skill discovery depends on your agent's configuration.

Make sure the launcher directory is on the `PATH` of the shell or agent that runs `kb`, for example with `export PATH="$HOME/.local/bin:$PATH"` in your shell profile.

```sh
kb start                   # descriptions of the documents preset for the current repo
kb search <query>          # the 10 best matches, --kind fact|doc|spec|note narrows them
kb read <slug>             # a document with a header saying how far to trust it
kb links <slug>            # links from and to a document, and its sources
```

`kb start` finds the current repo from the origin remote in its `.git` config and adds `presets/<owner>/<repo>.md` to `presets/all.md`. Ask your agent to add knowledge, or create a file in `vault/` using the format in [docs/spec.md](docs/spec.md) and the writing rules in [AGENTS.md](AGENTS.md). Each kind's rules live in its own file in `scripts/kinds/`. Open `vault/` as an Obsidian vault to browse and edit it.

```sh
bun run lint
bun run typecheck
bun test
```

If your repository still keeps knowledge in `facts/`, move each file into `vault/`, add `kind: fact` and `trust: reference` to its frontmatter, and run `bun run lint` to find anything else the new format needs. Then run `bun run install-skills` again to replace the old skills and add `kb`.

GitHub Actions runs the same checks. These are Bun scripts, so there is no separate build step.

MIT licensed. See [LICENSE](LICENSE).
