import { expect, test } from "bun:test"
import { maxHits, search } from "./search.ts"
import type { Document } from "./vault.ts"

const document = (slug: string, description: string, body: string): Document => ({
  slug,
  path: `vault/${slug}.md`,
  kind: "doc",
  trust: "reference",
  description,
  sources: [],
  body,
  links: [],
})

const slugs = (documents: Document[], query: string) => search(documents, query).map((hit) => hit.document.slug)

test("ranks a match in the description above the same match in a shorter body", () => {
  const documents = [
    document("alpha", "Caching for services with many clients", "Other words"),
    document("beta", "Other", "Caching here"),
  ]

  expect(slugs(documents, "caching")).toEqual(["alpha", "beta"])
})

test("ranks a match in the slug above the same match in a shorter body", () => {
  const documents = [
    document("cache", "Where responses are stored", "releasing here"),
    document("releasing-safely", "Shipping versions", "Merge to main first"),
  ]

  expect(slugs(documents, "releasing")).toEqual(["releasing-safely", "cache"])
})

test("finds documents by their body and returns at most the hit limit", () => {
  const documents = Array.from({ length: 15 }, (_, index) => document(`doc-${index}`, "Unrelated", "graphql"))

  expect(slugs(documents, "graphql")).toHaveLength(maxHits)
  expect(slugs(documents, "kafka")).toEqual([])
})
