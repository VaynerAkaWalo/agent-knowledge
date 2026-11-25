import { description, sources, trust } from "./fields.ts"
import type { DocumentKind } from "./kind.ts"

export const doc: DocumentKind<"doc"> = {
  name: "doc",
  fields: { trust, description, sources },
}
