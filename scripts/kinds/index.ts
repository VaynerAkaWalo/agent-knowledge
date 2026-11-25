import { doc } from "./doc.ts"
import { fact } from "./fact.ts"
import { note } from "./note.ts"
import { spec } from "./spec.ts"

export const documentKinds = [fact, doc, spec, note] as const

export type Kind = (typeof documentKinds)[number]["name"]

export const kinds = documentKinds.map((kind) => kind.name)
