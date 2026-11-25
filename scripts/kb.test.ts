import { afterAll, beforeAll, expect, test } from "bun:test"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { type Context, run } from "./kb.ts"

let directory: string
let context: Context
let project: string
let worktree: string

const write = async (root: string, path: string, text: string) => {
  await mkdir(dirname(join(root, path)), { recursive: true })
  await writeFile(join(root, path), text)
}

const files: Record<string, string> = {
  "vault/facts/releasing.md":
    "---\nkind: fact\ntrust: reliable\ndescription: Releasing a new version\nsources:\n  - Example-Org/releases\n---\nTag the release.\n",
  "vault/facts/queues.md": "---\nkind: fact\ntrust: reference\ndescription: Which queue to use\n---\nUse the shared queue.\n",
  "vault/docs/caching.md":
    "---\nkind: doc\ntrust: reference\ndescription: Adding a cache to a service\nsources:\n  - Example-Org/shop\n---\nRead-through cache, see [[releasing]].\n",
  "vault/specs/cache-spec.md":
    "---\nkind: spec\ntrust: reference\ndescription: Tracing caching back to its design\nstatus: implemented\nimplemented_in:\n  - Example-Org/shop#7\nsources:\n  - Example-Org/shop\n---\nPer-tenant keys. Built from [[caching]].\n",
  "vault/notes/checkout-triage.md":
    "---\nkind: note\ndescription: Investigating slow checkouts\ncreated: 2026-01-15\n---\nProposed splitting work into [[specs/cache-spec]].\n",
  "presets/all.md": "[[releasing]]\n",
  "presets/Example-Org/shop.md": "[[caching]]\n[[releasing]]\n",
}

const gitConfig = `[core]
\tbare = false
[remote "upstream"]
\turl = https://github.com/someone/else.git
[remote "origin"]
\turl = git@github.com:example-org/shop.git
\tfetch = +refs/heads/*:refs/remotes/origin/*
`

beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "kb-"))
  const root = join(directory, "knowledge")
  project = join(directory, "shop")
  worktree = join(directory, "shop-feature")

  for (const [path, text] of Object.entries(files)) await write(root, path, text)

  await write(project, ".git/config", gitConfig)
  await write(project, ".git/worktrees/feature/commondir", "../..\n")
  await write(worktree, ".git", "gitdir: ../shop/.git/worktrees/feature\n")
  await mkdir(join(project, "src"))

  context = { root, cwd: directory }
})

afterAll(async () => {
  await rm(directory, { recursive: true, force: true })
})

test("start prints the preset for every repo outside a repo with its own preset", async () => {
  const result = await run(["start"], context)

  expect(result.stdout).toBe("releasing (reliable): Releasing a new version\n")
})

test("start adds the current repo's preset after the shared one, each document once", async () => {
  const expected =
    "releasing (reliable): Releasing a new version\ncaching (reference): Adding a cache to a service\n"

  for (const cwd of [project, join(project, "src"), worktree]) {
    expect((await run(["start"], { ...context, cwd })).stdout).toBe(expected)
  }
})

test("search shows kind, trust and a note's creation date, and filters by kind", async () => {
  const all = await run(["search", "investigating"], context)
  const facts = await run(["search", "investigating", "--kind", "fact"], context)
  const notes = await run(["search", "investigating", "--kind=note"], context)

  expect(all.stdout).toContain("checkout-triage (note, reference, 2026-01-15): Investigating slow checkouts")
  expect(facts.stdout).toBe("No documents match.\n")
  expect(notes.stdout).toBe("checkout-triage (note, reference, 2026-01-15): Investigating slow checkouts\n")
  expect((await run(["search", "x", "--kind", "page"], context)).code).toBe(1)
})

test("read tells agents to verify reference documents and how far to trust each kind", async () => {
  const reliable = (await run(["read", "releasing"], context)).stdout
  const sourceless = (await run(["read", "queues"], context)).stdout
  const doc = (await run(["read", "caching"], context)).stdout
  const spec = (await run(["read", "cache-spec"], context)).stdout
  const note = (await run(["read", "checkout-triage"], context)).stdout

  expect(reliable).not.toContain("Reference")
  expect(reliable).toEndWith("---\nTag the release.\n")
  expect(sourceless).toContain("ask the owner")
  expect(doc).toContain("verify the claims you rely on against the sources on their current default branch")
  expect(doc).toContain("If it is stale, propose a fix.")
  expect(spec).toContain("implemented_in:\n  - Example-Org/shop#7")
  expect(spec).toContain("The code may have changed since.")
  expect(spec).not.toContain("propose a fix")
  expect(note).toContain("created: 2026-01-15")
  expect(note).toContain("This note records thinking on 2026-01-15.")
})

test("read says an implemented spec records intent even when it is reliable", async () => {
  const reliableSpec = files["vault/specs/cache-spec.md"].replace("trust: reference", "trust: reliable")
  await write(context.root, "vault/specs/cache-spec.md", reliableSpec)

  const result = await run(["read", "cache-spec"], context)
  await write(context.root, "vault/specs/cache-spec.md", files["vault/specs/cache-spec.md"])

  expect(result.stdout).toContain("trust: reliable")
  expect(result.stdout).toContain("The code may have changed since.")
  expect(result.stdout).not.toContain("verify the claims")
})

test("links lists outgoing links, backlinks and sources", async () => {
  const result = await run(["links", "caching"], context)

  expect(result.stdout).toBe(
    "links to:\n  - releasing\nlinked from:\n  - cache-spec\nsources:\n  - Example-Org/shop\n",
  )
})

test("resolves a link written as a path inside the vault", async () => {
  const result = await run(["links", "cache-spec"], context)

  expect(result.stdout).toContain("linked from:\n  - checkout-triage\n")
  expect(result.stderr).toBe("")
})

test("start points to search when nothing is preset", async () => {
  await writeFile(join(context.root, "presets/all.md"), "")

  const result = await run(["start"], context)
  await writeFile(join(context.root, "presets/all.md"), files["presets/all.md"])

  expect(result.stdout).toBe("No documents are preset for this repo. Find them with kb search <query>.\n")
})

test("read and links fail on a slug that doesn't exist", async () => {
  for (const command of ["read", "links"]) {
    const result = await run([command, "missing"], context)

    expect(result.code).toBe(1)
    expect(result.stderr).toContain("no document with slug missing")
  }
})

test("rejects options it doesn't know instead of searching for them", async () => {
  expect((await run(["search", "x", "--knd", "note"], context)).stderr).toContain("Unknown option '--knd'")
  expect((await run(["start", "--typo"], context)).code).toBe(1)
  expect((await run(["start", "extra"], context)).stderr).toContain("start takes no arguments")
  expect((await run(["read", "releasing", "--kind", "fact"], context)).stderr).toContain("--kind works only with search")
})

test("warns about invalid documents and preset entries instead of hiding them", async () => {
  await write(context.root, "vault/broken.md", "no frontmatter")
  await write(context.root, "vault/unsure.md", "---\nkind: fact\ntrust: maybe\ndescription: Unsure fact\n---\nBody.\n")
  await writeFile(join(context.root, "presets/all.md"), "[[releasing]]\n[[typo]]\n")

  const result = await run(["start"], context)
  const search = await run(["search", "unsure"], context)
  await rm(join(context.root, "vault/broken.md"))
  await rm(join(context.root, "vault/unsure.md"))
  await writeFile(join(context.root, "presets/all.md"), files["presets/all.md"])

  expect(result.code).toBe(0)
  expect(result.stderr).toContain("kb: vault/broken.md: must start with YAML frontmatter")
  expect(result.stderr).toContain("kb: presets/all.md: lists [[typo]], which doesn't exist")
  expect(result.stderr).toContain("kb: vault/unsure.md: trust")
  expect(search.stdout).toBe("No documents match.\n")
})
