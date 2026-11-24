import { readdir, readFile } from "node:fs/promises"
import { basename, join, relative, resolve } from "node:path"
import { checkField, parseWikilink } from "./kinds/field.ts"
import type { trustLevels } from "./kinds/fields.ts"
import { documentKinds, type Kind, kinds } from "./kinds/index.ts"
import type { specStatuses } from "./kinds/spec.ts"

export const repositoryRoot = resolve(import.meta.dir, "..")

export type { Kind } from "./kinds/index.ts"

export type Trust = (typeof trustLevels)[number]
export type SpecStatus = (typeof specStatuses)[number]

export type Spec = {
  status: SpecStatus
  implementedIn: string[]
  supersededBy?: string
}

export type Document = {
  slug: string
  path: string
  kind: Kind
  trust: Trust
  description: string
  sources: string[]
  spec?: Spec
  created?: string
  body: string
  links: string[]
}

export type Problem = { path: string; message: string }

const slugFile = /^[a-z0-9]+(-[a-z0-9]+)*\.md$/

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseFrontmatter = (text: string) => {
  const match = text.match(/^---\n([\s\S]*?)\n---(?:\n([\s\S]*))?$/)
  if (!match) return undefined

  try {
    return { data: Bun.YAML.parse(match[1]) as unknown, body: (match[2] ?? "").trim() }
  } catch {
    return undefined
  }
}

export const linkTarget = (inner: string) => {
  const target = inner.split("|")[0].split("#")[0].trim()

  if (target.endsWith(".md")) return target.slice(0, -3)
  if (/\.[^/]+$/.test(target)) return undefined

  return target
}

export const extractLinks = (body: string) => {
  const prose = body
    .replace(/```[\s\S]*?```/g, "")
    .replace(/~~~[\s\S]*?~~~/g, "")
    .replace(/`[^`\n]*`/g, "")
    .replace(/%%[\s\S]*?%%/g, "")

  const targets = [...prose.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((match) => linkTarget(match[1]))

  return [...new Set(targets.filter((target): target is string => Boolean(target)))]
}

export const parseDocument = (path: string, text: string) => {
  const errors: string[] = []
  const file = basename(path)

  if (!slugFile.test(file)) errors.push("file name must be a kebab-case slug ending in .md")

  const parsed = parseFrontmatter(text)
  if (!parsed || !isRecord(parsed.data)) {
    return { errors: [...errors, "must start with YAML frontmatter between --- lines"] }
  }

  const { data, body } = parsed
  const kind = documentKinds.find((candidate) => candidate.name === data.kind)

  if (!kind) return { errors: [...errors, `kind must be one of ${kinds.join(", ")}`] }

  for (const key of Object.keys(data)) {
    if (key !== "kind" && !Object.hasOwn(kind.fields, key)) errors.push(`unknown frontmatter key ${key} for a ${kind.name}`)
  }

  for (const [key, field] of Object.entries(kind.fields)) {
    const error = checkField(key, field, data[key])
    if (error) errors.push(error)
  }

  errors.push(...(kind.check?.(data) ?? []))

  if (!body) errors.push("body is empty")
  if (kind.maxBodyLength && body.length > kind.maxBodyLength) {
    errors.push(`body is ${body.length} characters, keep a ${kind.name} under ${kind.maxBodyLength} and point to the source instead`)
  }

  if (errors.length) return { errors }

  const spec: Spec | undefined =
    kind.name === "spec"
      ? {
          status: data.status as SpecStatus,
          implementedIn: (data.implemented_in as string[] | undefined) ?? [],
          supersededBy: typeof data.superseded_by === "string" ? parseWikilink(data.superseded_by) : undefined,
        }
      : undefined

  const document: Document = {
    slug: file.slice(0, -3),
    path,
    kind: kind.name,
    trust: (data.trust as Trust | undefined) ?? "reference",
    description: data.description as string,
    sources: (data.sources as string[] | undefined) ?? [],
    spec,
    created: data.created as string | undefined,
    body,
    links: extractLinks(body),
  }

  return { document, errors }
}

const markdownFiles = async (directory: string): Promise<string[]> => {
  const entries = await readdir(directory, { withFileTypes: true })

  const nested = await Promise.all(
    entries
      .filter((entry) => !entry.name.startsWith("."))
      .map((entry) => {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) return markdownFiles(path)
        return entry.name.endsWith(".md") ? [path] : []
      }),
  )

  return nested.flat().sort()
}

export const loadVault = async (root = repositoryRoot) => {
  const vault = join(root, "vault")
  const files = await markdownFiles(vault)

  const parsed = await Promise.all(
    files.map(async (file) => ({ path: relative(root, file), ...parseDocument(file, await readFile(file, "utf8")) })),
  )

  const problems: Problem[] = parsed.flatMap(({ path, errors }) => errors.map((message) => ({ path, message })))
  const found = parsed.flatMap(({ path, document }) => (document ? [{ ...document, path }] : []))
  const slugByVaultPath = new Map(found.map((document) => [relative(vault, join(root, document.path)).slice(0, -3), document.slug]))

  const documents = found.map((document) => ({
    ...document,
    links: [...new Set(document.links.map((link) => (link.includes("/") ? (slugByVaultPath.get(link) ?? link) : link)))],
  }))

  return { documents, problems }
}

export const checkReferences = (documents: Document[]) => {
  const problems: Problem[] = []
  const bySlug = new Map<string, Document>()

  for (const document of documents) {
    const existing = bySlug.get(document.slug)
    if (existing) problems.push({ path: document.path, message: `slug ${document.slug} is also used by ${existing.path}` })
    else bySlug.set(document.slug, document)
  }

  for (const document of documents) {
    const targets = [...document.links, ...(document.spec?.supersededBy ? [document.spec.supersededBy] : [])]

    for (const target of targets) {
      if (!bySlug.has(target)) problems.push({ path: document.path, message: `links to [[${target}]], which doesn't exist` })
    }

    const successor = document.spec?.supersededBy ? bySlug.get(document.spec.supersededBy) : undefined
    if (successor && successor.kind !== "spec") {
      problems.push({ path: document.path, message: `superseded_by must point to a spec, [[${successor.slug}]] is a ${successor.kind}` })
    }
  }

  return { bySlug, problems }
}
