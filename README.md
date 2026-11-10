# agent-knowledge

A small knowledge base for coding agents. Keep decisions, rationale and context that source code does not explain in short Markdown facts, one per file. The template starts with an empty `facts/` directory.

Use GitHub's Use this template button to create your own repository, then clone it. Choose a private repository if your facts contain private project information.

```sh
bun install --frozen-lockfile
bun run install-skills
```

The installer writes `knowledge` and `knowledge-ingest` skills for Claude, Codex, Cursor and Grok, pointing at your checkout. It replaces existing `SKILL.md` files with those names. Agent homes default to `~/.claude`, `~/.codex`, `~/.cursor` and `~/.grok`. Override them with `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, `CURSOR_HOME` and `GROK_HOME` respectively. Run the installer again if you move the checkout. Automatic skill discovery depends on your agent's configuration.

Ask your agent to add a fact, or create a file in `facts/` using the format in [AGENTS.md](AGENTS.md). The `knowledge` skill reads descriptions before relevant facts and checks their sources. The `knowledge-ingest` skill proposes additions or corrections for approval before opening a pull request.

```sh
bun run lint
bun run typecheck
bun test
```

GitHub Actions runs the same checks. These are Bun scripts, so there is no separate build step.

MIT licensed. See [LICENSE](LICENSE).
