import { description, sources, trust } from "./fields.ts"
import type { DocumentKind } from "./kind.ts"

export const fact: DocumentKind<"fact"> = {
  name: "fact",
  fields: { trust, description, sources },
  maxBodyLength: 600,
}
