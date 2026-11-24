import { expect, test } from "bun:test"
import { lintRepository } from "./lint.ts"
import { checkReferences, type Document, extractLinks, parseDocument } from "./vault.ts"

const markdown = (frontmatter: string, body = "Releases are tagged from main and published by CI.") =>
  `---\n${frontmatter}\n---\n${body}\n`

const errors = (frontmatter: string, body?: string, file = "vault/a.md") =>
  parseDocument(file, markdown(frontmatter, body)).errors

const fact = "kind: fact\ntrust: reliable\ndescription: How releases work"

test("accepts every kind with its required keys", () => {
  expect(errors(`${fact}\nsources:\n  - Example-Org/releases`)).toEqual([])
  expect(errors("kind: doc\ntrust: reference\ndescription: Caching")).toEqual([])
  expect(errors("kind: note\ndescription: Triage of slow checkouts\ncreated: 2026-02-10")).toEqual([])
  expect(
    errors("kind: spec\ntrust: reference\ndescription: Caching\nstatus: implemented\nimplemented_in:\n  - Example-Org/shop#7"),
  ).toEqual([])
})

test("keeps facts short so they point to the source instead of copying it, while other kinds have no limit", () => {
  expect(errors(fact, "x".repeat(601)).join()).toContain("keep a fact under 600")
  expect(errors("kind: doc\ntrust: reference\ndescription: Caching", "x".repeat(5000))).toEqual([])
})

test("rejects frontmatter that doesn't match the kind", () => {
  expect(errors("kind: page\ndescription: a").join()).toContain("kind must be one of")
  expect(errors("kind: doc\ndescription: a").join()).toContain("trust is required")
  expect(errors("kind: doc\ntrust: maybe\ndescription: a").join()).toContain("trust must be one of reliable, reference")
  expect(errors("kind: note\ntrust: reference\ndescription: a\ncreated: 2026-02-10").join()).toContain(
    "unknown frontmatter key trust for a note",
  )
  expect(errors(`${fact}\ncreated: 2026-02-10`).join()).toContain("unknown frontmatter key created for a fact")
  expect(errors(`${fact}\nstatus: draft`).join()).toContain("unknown frontmatter key status for a fact")
  expect(errors(`${fact}\nverified: 2026-01-01`).join()).toContain("unknown frontmatter key verified")
})

test("rejects bad descriptions, sources, slugs and missing frontmatter", () => {
  expect(errors(`kind: fact\ntrust: reliable\ndescription: ${"x".repeat(121)}`).join()).toContain(
    "description must be at most 120 characters",
  )
  expect(parseDocument("vault/a.md", "No frontmatter").errors).toContain("must start with YAML frontmatter between --- lines")
  expect(errors("kind: fact\ntrust: reliable\ndescription: ''").join()).toContain("description must be one non-empty line")
  expect(errors(`${fact}\nsources:\n  - releases`).join()).toContain("sources must be")
  expect(errors(fact, undefined, "vault/Shop Notes.md").join()).toContain("kebab-case")
  expect(errors(fact, "").join()).toContain("body is empty")
  expect(parseDocument("vault/a.md", `---\n${fact}\n---not a delimiter\nBody`).errors).toContain(
    "must start with YAML frontmatter between --- lines",
  )
})

test("requires the spec keys that its status implies", () => {
  const spec = "kind: spec\ntrust: reference\ndescription: Caching"

  expect(errors(spec).join()).toContain("status is required")
  expect(errors(`${spec}\nstatus: done`).join()).toContain("status must be one of draft, implemented, superseded")
  expect(errors(`${spec}\nstatus: implemented`).join()).toContain("needs implemented_in")
  expect(errors(`${spec}\nstatus: draft\nimplemented_in:\n  - shop`).join()).toContain("owner/repo#number")
  expect(errors(`${spec}\nstatus: superseded`).join()).toContain("needs superseded_by")
  expect(errors(`${spec}\nstatus: superseded\nsuperseded_by: [[newer]]`).join()).toContain('quoted "[[slug]]"')
  expect(errors(`${spec}\nstatus: superseded\nsuperseded_by: "[[newer|caption]]"`).join()).toContain('quoted "[[slug]]"')
  expect(errors(`${spec}\nstatus: superseded\nsuperseded_by: "[[newer]]"`)).toEqual([])
})

test("treats a note as reference and requires the date it was written", () => {
  const { document } = parseDocument("vault/triage.md", markdown("kind: note\ndescription: Triage\ncreated: 2026-02-10"))

  expect(document?.trust).toBe("reference")
  expect(document?.created).toBe("2026-02-10")
  expect(errors("kind: note\ndescription: Triage").join()).toContain("created is required")
  expect(errors("kind: note\ndescription: Triage\ncreated: 2026-13-45").join()).toContain("created must be a date as YYYY-MM-DD")
  expect(errors("kind: note\ndescription: Triage\ncreated: 2026-02-29").join()).toContain("created must be a date as YYYY-MM-DD")
  expect(errors("kind: note\ndescription: Triage\ncreated: yesterday").join()).toContain("created must be a date as YYYY-MM-DD")
})

test("reads the Obsidian link forms and ignores links inside code and comments", () => {
  const body = [
    "See [[releasing]], [[service-map|the map]], [[queues#Retries]], [[glossary.md]] and ![[diagram.png]].",
    "```\n[[fenced]]\n```",
    "~~~\n[[tilde]]\n~~~",
    "Use `%%` as the marker, see [[visible]].",
    "%% [[comment]] %%",
    "Also `[[inline]]` and [[releasing]].",
  ].join("\n\n")

  expect(extractLinks(body)).toEqual(["releasing", "service-map", "queues", "glossary", "visible"])
})

test("keeps a folder in a link so it fails instead of resolving to a file elsewhere", () => {
  expect(extractLinks("[[wrong-folder/releasing]]")).toEqual(["wrong-folder/releasing"])
})

const document = (slug: string, links: string[] = [], supersededBy?: string): Document => ({
  slug,
  path: `vault/${slug}.md`,
  kind: supersededBy ? "spec" : "doc",
  trust: "reference",
  description: slug,
  sources: [],
  spec: supersededBy ? { status: "superseded", implementedIn: [], supersededBy } : undefined,
  body: slug,
  links,
})

test("rejects duplicate slugs and links to documents that don't exist", () => {
  const { problems } = checkReferences([
    document("a", ["b", "missing"]),
    document("b", [], "gone"),
    { ...document("a"), path: "vault/other/a.md" },
  ])

  expect(problems.map((problem) => problem.message)).toEqual([
    "slug a is also used by vault/a.md",
    "links to [[missing]], which doesn't exist",
    "links to [[gone]], which doesn't exist",
  ])
})

test("rejects a spec superseded by anything but a spec", () => {
  const { problems } = checkReferences([document("old", [], "living"), document("living")])

  expect(problems.map((problem) => problem.message)).toEqual(["superseded_by must point to a spec, [[living]] is a doc"])
})

test("every document and preset in the repository is valid", async () => {
  const { problems } = await lintRepository()

  expect(problems).toEqual([])
})
