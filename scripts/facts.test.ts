import { expect, test } from "bun:test"
import { lintFact, lintFacts } from "./facts.ts"

const fact = (frontmatter: string, body = "Keep shared decisions here and implementation details in the source.") =>
  `---\n${frontmatter}\n---\n${body}\n`

test("accepts a short fact with sources", () => {
  expect(lintFact("shared-decisions.md", fact("description: Shared decisions live here\nsources:\n  - example/project"))).toEqual([])
})

test("limits descriptions to 120 characters so the fact index stays concise", () => {
  expect(lintFact("a.md", fact(`description: ${"x".repeat(120)}`))).toEqual([])
  expect(lintFact("a.md", fact(`description: ${"x".repeat(121)}`))).toContain(
    "description is 121 characters, keep it at most 120",
  )
})

test("rejects long bodies so facts point to the source instead of copying it", () => {
  const errors = lintFact("shared-decisions.md", fact("description: Shared decisions live here", "x".repeat(601)))

  expect(errors.join()).toContain("keep it under 600")
})

test("rejects missing frontmatter, unknown keys, bad sources and bad slugs", () => {
  expect(lintFact("a.md", "No frontmatter")).toContain("must start with YAML frontmatter between --- lines")
  expect(lintFact("a.md", fact("description: a\nverified: 2026-01-01"))).toContain("unknown frontmatter key verified")
  expect(lintFact("a.md", fact("description: a\nsources:\n  - project")).join()).toContain("sources must be")
  expect(lintFact("Shared Decisions.md", fact("description: a")).join()).toContain("kebab-case")
})

test("every fact in the repository is valid", async () => {
  const invalid = (await lintFacts()).filter(({ errors }) => errors.length)

  expect(invalid).toEqual([])
})
