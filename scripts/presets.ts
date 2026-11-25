import { readdir, readFile } from "node:fs/promises"
import { join, relative } from "node:path"
import { parseWikilink } from "./kinds/field.ts"
import type { Problem } from "./vault.ts"

export type Preset = { path: string; repo?: string; slugs: string[]; problems: Problem[] }

const parsePreset = (path: string, text: string, repo?: string): Preset => {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean)
  const slugs: string[] = []
  const problems: Problem[] = []

  for (const line of lines) {
    const slug = parseWikilink(line)
    if (slug) slugs.push(slug)
    else problems.push({ path, message: `line "${line}" must be one [[slug]]` })
  }

  return { path, repo, slugs, problems }
}

const entries = async (directory: string) =>
  (await readdir(directory, { withFileTypes: true }))
    .filter((entry) => !entry.name.startsWith("."))
    .sort((left, right) => left.name.localeCompare(right.name, "en", { caseFirst: "upper" }))

export const loadPresets = async (root: string) => {
  const directory = join(root, "presets")
  const presets: Preset[] = []
  const problems: Problem[] = []

  const read = async (path: string, repo?: string) =>
    presets.push(parsePreset(relative(root, path), await readFile(path, "utf8"), repo))

  for (const entry of await entries(directory)) {
    const path = join(directory, entry.name)

    if (entry.isFile() && entry.name === "all.md") {
      await read(path)
      continue
    }

    if (!entry.isDirectory()) {
      problems.push({ path: relative(root, path), message: "presets hold only all.md and <owner>/<repo>.md" })
      continue
    }

    for (const file of await entries(path)) {
      const filePath = join(path, file.name)

      if (file.isFile() && file.name.endsWith(".md")) await read(filePath, `${entry.name}/${file.name.slice(0, -3)}`)
      else problems.push({ path: relative(root, filePath), message: "presets hold only all.md and <owner>/<repo>.md" })
    }
  }

  if (!presets.some((preset) => !preset.repo)) problems.push({ path: "presets/all.md", message: "is missing" })

  const seen = new Map<string, string>()
  for (const preset of presets) {
    if (!preset.repo) continue

    const key = preset.repo.toLowerCase()
    const other = seen.get(key)

    if (other) problems.push({ path: preset.path, message: `is the same repo as ${other}, GitHub names ignore case` })
    else seen.set(key, preset.path)
  }

  return { presets, problems: [...problems, ...presets.flatMap((preset) => preset.problems)] }
}

export const checkPresets = (presets: Preset[], slugs: Set<string>) =>
  presets.flatMap((preset) =>
    preset.slugs
      .filter((slug) => !slugs.has(slug))
      .map((slug) => ({ path: preset.path, message: `lists [[${slug}]], which doesn't exist` })),
  )

export const presetSlugs = (presets: Preset[], repo?: string) => {
  const all = presets.find((preset) => !preset.repo)?.slugs ?? []
  const own = repo ? (presets.find((preset) => preset.repo?.toLowerCase() === repo.toLowerCase())?.slugs ?? []) : []

  return [...new Set([...all, ...own])]
}
