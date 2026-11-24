import { description, sources } from "./fields.ts"
import type { DocumentKind } from "./kind.ts"

export const note: DocumentKind<"note"> = {
  name: "note",
  fields: { description, sources, created: { type: "date", required: true } },
}
