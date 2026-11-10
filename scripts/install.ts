import { mkdir, readdir, readFile, realpath, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")

const targets = [
  { name: "claude", homeEnv: "CLAUDE_CONFIG_DIR" },
  { name: "codex", homeEnv: "CODEX_HOME" },
  { name: "cursor", homeEnv: "CURSOR_HOME" },
  { name: "grok", homeEnv: "GROK_HOME" },
]

const home = (target: (typeof targets)[number]) =>
  process.env[target.homeEnv]?.trim() || join(homedir(), `.${target.name}`)

const skills = await Promise.all(
  (await readdir(join(root, "skills"))).map(async (name) => {
    const template = await readFile(join(root, "skills", name, "SKILL.md"), "utf8")
    return { name, text: template.replaceAll("{{root}}", root) }
  }),
)

for (const target of targets) {
  for (const skill of skills) {
    const directory = join(home(target), "skills", skill.name)

    await mkdir(directory, { recursive: true })
    await writeFile(join(directory, "SKILL.md"), skill.text)

    console.log(`${target.name} ${skill.name}: ${await realpath(directory)}`)
  }
}
