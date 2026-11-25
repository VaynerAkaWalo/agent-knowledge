import { parseArgs } from "node:util"
import { originRepo } from "./git.ts"
import { lintRepository } from "./lint.ts"
import { type Preset, presetSlugs } from "./presets.ts"
import { maxHits, search } from "./search.ts"
import { kinds } from "./kinds/index.ts"
import { type Document, repositoryRoot } from "./vault.ts"

export type Context = { root: string; cwd: string }
export type Result = { code: number; stdout: string; stderr: string }

const usage = `Usage:
  kb start                          descriptions of the documents preset for the current repo
  kb search <query> [--kind <kind>] the ${maxHits} best matching documents
  kb read <slug>                    a document with its header
  kb links <slug>                   links from and to a document, and its sources`

const ok = (lines: string[]): Result => ({ code: 0, stdout: `${lines.join("\n")}\n`, stderr: "" })
const fail = (message: string): Result => ({ code: 1, stdout: "", stderr: `kb: ${message}\n` })

const list = (items: string[]) => (items.length ? items.map((item) => `  - ${item}`) : ["  (none)"])

const start = (cwd: string, presets: Preset[], documents: Map<string, Document>) => {
  const slugs = presetSlugs(presets, originRepo(cwd))

  const lines = slugs.flatMap((slug) => {
    const document = documents.get(slug)
    return document ? [`${slug} (${document.trust}): ${document.description}`] : []
  })

  return ok(lines.length ? lines : ["No documents are preset for this repo. Find them with kb search <query>."])
}

const find = (documents: Document[], query: string, kind?: string) => {
  if (kind !== undefined && !kinds.includes(kind as Document["kind"])) {
    return fail(`--kind must be one of ${kinds.join(", ")}`)
  }
  if (!query.trim()) return fail("search needs a query")

  const candidates = kind ? documents.filter((document) => document.kind === kind) : documents
  const hits = search(candidates, query)
  if (!hits.length) return ok(["No documents match."])

  return ok(
    hits.map(({ document }) => {
      const labels = [document.kind, document.trust, ...(document.created ? [document.created] : [])]
      return `${document.slug} (${labels.join(", ")}): ${document.description}`
    }),
  )
}

const guidance = (document: Document) => {
  const historical =
    document.spec?.status === "implemented"
      ? ["This spec records the intent when the feature was built. The code may have changed since."]
      : []
  if (document.trust !== "reference") return historical

  const lines = [
    document.sources.length
      ? "Reference: verify the claims you rely on against the sources on their current default branch before acting on them."
      : "Reference without sources: ask the owner before acting on its claims.",
  ]

  if (document.kind === "fact" || document.kind === "doc") lines.push("If it is stale, propose a fix.")
  if (document.created) lines.push(`This note records thinking on ${document.created}.`)

  return [...lines, ...historical]
}

const read = (document: Document) => {
  const header = [
    `slug: ${document.slug}`,
    `kind: ${document.kind}`,
    `trust: ${document.trust}`,
    `description: ${document.description}`,
    ...(document.sources.length ? ["sources:", ...list(document.sources)] : []),
    ...(document.spec ? [`status: ${document.spec.status}`] : []),
    ...(document.spec?.implementedIn.length ? ["implemented_in:", ...list(document.spec.implementedIn)] : []),
    ...(document.spec?.supersededBy ? [`superseded_by: [[${document.spec.supersededBy}]]`] : []),
    ...(document.created ? [`created: ${document.created}`] : []),
    ...guidance(document),
  ]

  return ok([...header, "---", document.body])
}

const links = (documents: Document[], document: Document) => {
  const backlinks = documents
    .filter((other) => other.links.includes(document.slug) || other.spec?.supersededBy === document.slug)
    .map((other) => other.slug)

  const outgoing = [...document.links, ...(document.spec?.supersededBy ? [document.spec.supersededBy] : [])]

  return ok([
    "links to:",
    ...list([...new Set(outgoing)]),
    "linked from:",
    ...list([...new Set(backlinks)]),
    "sources:",
    ...list(document.sources),
  ])
}

type Repository = Awaited<ReturnType<typeof lintRepository>>

const parse = (args: string[]) => {
  try {
    const { values, positionals } = parseArgs({ args, allowPositionals: true, options: { kind: { type: "string" } } })
    return { kind: values.kind, positionals }
  } catch (error) {
    return { error: (error as Error).message }
  }
}

const dispatch = (args: string[], context: Context, repository: Repository) => {
  const parsed = parse(args)
  if (parsed.error !== undefined) return fail(parsed.error)

  const [command, ...rest] = parsed.positionals
  const bySlug = new Map(repository.documents.map((document) => [document.slug, document]))

  if (command !== "search" && parsed.kind !== undefined) return fail("--kind works only with search")

  if (command === "start") {
    if (rest.length) return fail("start takes no arguments")
    return start(context.cwd, repository.presets, bySlug)
  }

  if (command === "search") return find(repository.documents, rest.join(" "), parsed.kind)

  if (command === "read" || command === "links") {
    if (rest.length !== 1) return fail(`${command} needs one slug`)

    const document = bySlug.get(rest[0])
    if (!document) return fail(`no document with slug ${rest[0]}`)

    return command === "read" ? read(document) : links(repository.documents, document)
  }

  if (!command) return ok([usage])
  return { ...fail(`unknown command ${command}`), stderr: `kb: unknown command ${command}\n${usage}\n` }
}

export const run = async (args: string[], context: Context): Promise<Result> => {
  const repository = await lintRepository(context.root)

  const result = dispatch(args, context, repository)
  if (!repository.problems.length) return result

  const problems = repository.problems.map((problem) => `kb: ${problem.path}: ${problem.message}\n`).join("")
  return { ...result, stderr: `${result.stderr}${problems}` }
}

if (import.meta.main) {
  const result = await run(Bun.argv.slice(2), { root: repositoryRoot, cwd: process.cwd() })

  process.stdout.write(result.stdout)
  process.stderr.write(result.stderr)
  process.exit(result.code)
}
