import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"

const slug = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/
const source = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+(\/[^\s]+)?$/
const maxDescriptionLength = 120
const maxBodyLength = 600

export const factsDirectory = resolve(import.meta.dir, "..", "facts")

const parseFrontmatter = (text: string) => {
  const match = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) return undefined

  try {
    return { data: Bun.YAML.parse(match[1]) as unknown, body: match[2].trim() }
  } catch {
    return undefined
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

export const lintFact = (file: string, text: string) => {
  const errors: string[] = []

  if (!slug.test(file)) errors.push("file name must be a kebab-case slug ending in .md")

  const parsed = parseFrontmatter(text)
  if (!parsed || !isRecord(parsed.data)) return [...errors, "must start with YAML frontmatter between --- lines"]

  const { description, sources = [], ...rest } = parsed.data

  for (const key of Object.keys(rest)) errors.push(`unknown frontmatter key ${key}`)

  if (typeof description !== "string" || !description.trim() || description.includes("\n")) {
    errors.push("description must be one non-empty line")
  } else if (description.length > maxDescriptionLength) {
    errors.push(`description is ${description.length} characters, keep it at most ${maxDescriptionLength}`)
  }

  const validSources = Array.isArray(sources) && sources.every((entry) => typeof entry === "string" && source.test(entry))
  if (!validSources) errors.push("sources must be a list of owner/repo or owner/repo/path entries")

  if (!parsed.body) errors.push("body is empty")
  if (parsed.body.length > maxBodyLength) {
    errors.push(`body is ${parsed.body.length} characters, keep it under ${maxBodyLength} and point to the source instead`)
  }

  return errors
}

export const lintFacts = async (directory = factsDirectory) => {
  const files = (await readdir(directory)).filter((file) => !file.startsWith("."))

  return Promise.all(
    files.map(async (file) => ({ file, errors: lintFact(file, await readFile(join(directory, file), "utf8")) })),
  )
}
