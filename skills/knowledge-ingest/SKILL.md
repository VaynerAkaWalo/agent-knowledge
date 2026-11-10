---
name: knowledge-ingest
description: Use when I ask to add to my knowledge base, fix a fact in it, or ingest facts from conversations.
---

My knowledge base is the git repo at `{{root}}`. Pull before editing. Its AGENTS.md defines the fact format.

Cover the current conversation unless I name others. Transcripts are in `~/.claude/projects` and `~/.codex/sessions`. Keep only what a future agent couldn't get from the sources, like my corrections, rules with their reasons and where things live. Update or delete an existing fact before adding a new one.

Propose the changes and wait for my approval, then open a PR once `bun run lint` passes.
