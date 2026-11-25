import { afterAll, expect, test } from "bun:test"
import { cp, lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const directories: string[] = []

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })))
})

test("installs every skill for every agent and a working kb, pointing at the checkout it runs from", async () => {
  const directory = await mkdtemp(join(tmpdir(), "knowledge-install-"))
  directories.push(directory)

  const checkout = join(directory, "check'out-$HOME")
  for (const name of ["scripts", "skills", "vault", "presets"]) {
    await cp(resolve(import.meta.dir, "..", name), join(checkout, name), { recursive: true })
  }

  const homes: Record<string, string> = Object.fromEntries(
    ["claude", "codex", "cursor", "grok"].map((name) => [name, join(directory, name)]),
  )

  const managed = join(directory, "managed-kb")
  await writeFile(managed, "managed elsewhere\n")
  await mkdir(join(directory, "bin"))
  await symlink(managed, join(directory, "bin", "kb"))

  const install = Bun.spawn([process.execPath, join(checkout, "scripts", "install.ts")], {
    env: {
      ...Bun.env,
      CLAUDE_CONFIG_DIR: homes.claude,
      CODEX_HOME: homes.codex,
      CURSOR_HOME: homes.cursor,
      GROK_HOME: homes.grok,
      KB_BIN_DIR: join(directory, "bin"),
    },
    stdout: "pipe",
    stderr: "pipe",
  })
  expect(await install.exited).toBe(0)

  for (const home of Object.values(homes)) {
    for (const name of ["knowledge", "knowledge-ingest"]) {
      const skill = await readFile(join(home, "skills", name, "SKILL.md"), "utf8")

      expect(skill).toContain(`git repo at \`${checkout}\``)
      expect(skill).not.toContain("{{root}}")
    }
  }

  const kb = Bun.spawn([join(directory, "bin", "kb")], { stdout: "pipe", stderr: "pipe" })

  expect(await kb.exited).toBe(0)
  expect((await lstat(join(directory, "bin", "kb"))).isSymbolicLink()).toBe(false)
  expect(await readFile(managed, "utf8")).toBe("managed elsewhere\n")
  expect(await new Response(kb.stdout).text()).toContain("kb search <query>")
})
