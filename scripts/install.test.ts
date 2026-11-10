import { afterAll, expect, test } from "bun:test"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const directories: string[] = []

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })))
})

test("installs every skill for every agent pointing at this checkout", async () => {
  const directory = await mkdtemp(join(tmpdir(), "knowledge-install-"))
  directories.push(directory)

  const homes: Record<string, string> = Object.fromEntries(
    ["claude", "codex", "cursor", "grok"].map((name) => [name, join(directory, name)]),
  )

  const install = Bun.spawn([process.execPath, resolve(import.meta.dir, "install.ts")], {
    env: {
      ...Bun.env,
      CLAUDE_CONFIG_DIR: homes.claude,
      CODEX_HOME: homes.codex,
      CURSOR_HOME: homes.cursor,
      GROK_HOME: homes.grok,
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(await install.exited).toBe(0)

  for (const home of Object.values(homes)) {
    for (const name of ["knowledge", "knowledge-ingest"]) {
      const skill = await readFile(join(home, "skills", name, "SKILL.md"), "utf8")

      expect(skill).toContain(`git repo at \`${resolve(import.meta.dir, "..")}\``)
      expect(skill).not.toContain("{{root}}")
    }
  }
})
