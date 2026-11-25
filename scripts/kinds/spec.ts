import { description, sources, trust } from "./fields.ts"
import type { DocumentKind } from "./kind.ts"

export const specStatuses = ["draft", "implemented", "superseded"] as const

export const spec: DocumentKind<"spec"> = {
  name: "spec",
  fields: {
    trust,
    description,
    sources,
    status: { type: "text", required: true, allowedValues: specStatuses },
    implemented_in: {
      type: "list",
      required: false,
      itemPattern: /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+#[1-9][0-9]*$/,
      itemFormat: "owner/repo#number",
    },
    superseded_by: { type: "link", required: false },
  },
  check: (frontmatter) => [
    ...(frontmatter.status === "implemented" && !(frontmatter.implemented_in as string[] | undefined)?.length
      ? ["an implemented spec needs implemented_in"]
      : []),
    ...(frontmatter.status === "superseded" && frontmatter.superseded_by === undefined
      ? ['a superseded spec needs superseded_by as a quoted "[[slug]]"']
      : []),
  ],
}
