import type { Field } from "./field.ts"

export const trustLevels = ["reliable", "reference"] as const

export const trust: Field = { type: "text", required: true, allowedValues: trustLevels }

export const description: Field = { type: "text", required: true, maxLength: 120 }

export const sources: Field = {
  type: "list",
  required: false,
  itemPattern: /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+(\/[^\s]+)?$/,
  itemFormat: "owner/repo or owner/repo/path",
}
