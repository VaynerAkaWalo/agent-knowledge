import type { Document } from "./vault.ts"

const fields = [
  { weight: 3, text: (document: Document) => document.slug },
  { weight: 3, text: (document: Document) => document.description },
  { weight: 1, text: (document: Document) => document.body },
] as const

const k1 = 1.2
const b = 0.75
export const maxHits = 10

export const tokenize = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean)

const counts = (tokens: string[]) => {
  const result = new Map<string, number>()
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1)
  return result
}

export const search = (documents: Document[], query: string) => {
  const terms = [...new Set(tokenize(query))]

  const indexed = documents.map((document) => ({
    document,
    fields: fields.map((field) => {
      const tokens = tokenize(field.text(document))
      return { weight: field.weight, length: tokens.length, counts: counts(tokens) }
    }),
  }))

  const averageLengths = fields.map(
    (_, index) => indexed.reduce((sum, entry) => sum + entry.fields[index].length, 0) / Math.max(indexed.length, 1),
  )

  const inverseFrequency = (term: string) => {
    const matching = indexed.filter((entry) => entry.fields.some((field) => field.counts.has(term))).length
    return Math.log(1 + (indexed.length - matching + 0.5) / (matching + 0.5))
  }

  const weightedTerms = terms.map((term) => ({ term, idf: inverseFrequency(term) }))

  const score = (entry: (typeof indexed)[number]) =>
    weightedTerms.reduce((total, { term, idf }) => {
      const frequency = entry.fields.reduce((sum, field, index) => {
        const normalizedLength = 1 - b + b * (field.length / (averageLengths[index] || 1))
        return sum + (field.weight * (field.counts.get(term) ?? 0)) / normalizedLength
      }, 0)

      return total + (idf * frequency) / (k1 + frequency)
    }, 0)

  return indexed
    .map((entry) => ({ document: entry.document, score: score(entry) }))
    .filter((hit) => hit.score > 0)
    .sort((left, right) => right.score - left.score || left.document.slug.localeCompare(right.document.slug))
    .slice(0, maxHits)
}
