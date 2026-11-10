import { afterAll, expect, test } from "bun:test"
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"

const directories: string[] = []

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })))
})

test("reads the index before and after the first fact is added", async () => {
  const skill = await readFile(resolve(import.meta.dir, "../skills/knowledge/SKILL.md"), "utf8")
  const command = skill.match(/index with `([^`]+)`/)
  if (!command) throw new Error("Knowledge skill must define its index command")

  const directory = await mkdtemp(join(tmpdir(), "knowledge-index-"))
  directories.push(directory)

  await mkdir(join(directory, "facts"))
  await writeFile(join(directory, "facts/.gitkeep"), "")

  const readIndex = async () => {
    const index = Bun.spawn(["sh", "-c", command[1]], { cwd: directory, stdout: "pipe", stderr: "pipe" })
    const [code, stdout, stderr] = await Promise.all([
      index.exited,
      new Response(index.stdout).text(),
      new Response(index.stderr).text(),
    ])

    return { code, stdout, stderr }
  }

  expect(await readIndex()).toEqual({ code: 0, stdout: "", stderr: "" })

  await writeFile(
    join(directory, "facts/shared-decisions.md"),
    "---\ndescription: Shared decisions live here\n---\nKeep implementation details in the source.\n",
  )

  expect(await readIndex()).toEqual({
    code: 0,
    stdout: "facts/shared-decisions.md:description: Shared decisions live here\n",
    stderr: "",
  })
})
