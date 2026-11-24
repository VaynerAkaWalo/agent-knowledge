import { afterAll, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { checkPresets, loadPresets, presetSlugs } from "./presets.ts"

const directories: string[] = []

afterAll(async () => {
  await Promise.all(directories.map((directory) => rm(directory, { recursive: true, force: true })))
})

const fixture = async (files: Record<string, string>) => {
  const root = await mkdtemp(join(tmpdir(), "kb-presets-"))
  directories.push(root)

  for (const [path, text] of Object.entries(files)) {
    await mkdir(join(root, path, ".."), { recursive: true })
    await writeFile(join(root, path), text)
  }

  return root
}

test("rejects lines that aren't one [[slug]], files outside the layout and slugs that don't exist", async () => {
  const root = await fixture({
    "presets/all.md": "[[releasing]]\n\n- [[service-map]]\n[[releasing|caption]]\n",
    "presets/stray.md": "[[releasing]]\n",
    "presets/Example-Org/shop.md": "[[missing]]\n",
  })

  const { presets, problems } = await loadPresets(root)
  const messages = [...problems, ...checkPresets(presets, new Set(["releasing"]))].map(
    (problem) => `${problem.path}: ${problem.message}`,
  )

  expect(messages).toEqual([
    "presets/stray.md: presets hold only all.md and <owner>/<repo>.md",
    'presets/all.md: line "- [[service-map]]" must be one [[slug]]',
    'presets/all.md: line "[[releasing|caption]]" must be one [[slug]]',
    "presets/Example-Org/shop.md: lists [[missing]], which doesn't exist",
  ])
})

test("requires the shared preset", async () => {
  const root = await fixture({ "presets/Example-Org/shop.md": "[[releasing]]\n" })

  expect((await loadPresets(root)).problems.map((problem) => problem.message)).toEqual(["is missing"])
})

test("rejects two presets for the same repo in different case", async () => {
  const root = await fixture({
    "presets/all.md": "",
    "presets/Example-Org/shop.md": "",
    "presets/example-org/shop.md": "",
  })

  const messages = (await loadPresets(root)).problems.map((problem) => problem.message)

  expect(messages).toEqual(["is the same repo as presets/Example-Org/shop.md, GitHub names ignore case"])
})

test("matches the repo preset regardless of case", async () => {
  const root = await fixture({
    "presets/all.md": "[[releasing]]\n",
    "presets/Example-Org/shop.md": "[[caching]]\n",
  })

  const { presets } = await loadPresets(root)

  expect(presetSlugs(presets, "example-org/Shop")).toEqual(["releasing", "caching"])
  expect(presetSlugs(presets)).toEqual(["releasing"])
})
