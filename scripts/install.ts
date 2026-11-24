import { chmod, mkdir, readdir, readFile, realpath, rename, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import { delimiter, join, resolve } from "node:path"

const root = resolve(import.meta.dir, "..")
const binDirectory = process.env.KB_BIN_DIR?.trim() || join(homedir(), ".local", "bin")

const shellQuote = (value: string) => `'${value.replaceAll("'", "'\\''")}'`

const launcher = `#!/bin/sh
exec ${shellQuote(process.execPath)} ${shellQuote(join(root, "scripts", "kb.ts"))} "$@"
`

const launcherPath = join(binDirectory, "kb")
const staged = join(binDirectory, `.kb-${process.pid}`)

await mkdir(binDirectory, { recursive: true })
await writeFile(staged, launcher)
await chmod(staged, 0o755)
await rename(staged, launcherPath)

console.log(`kb: ${launcherPath}`)

const onPath = (process.env.PATH ?? "").split(delimiter).includes(binDirectory)
if (!onPath) console.warn(`${binDirectory} is not on PATH, add it so agents can run kb`)

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
