import type { Field } from "./field.ts"

export interface DocumentKind<Name extends string = string> {
  name: Name
  fields: Record<string, Field>
  maxBodyLength?: number
  check?: (frontmatter: Record<string, unknown>) => string[]
}
