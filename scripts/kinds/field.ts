const isoDate = /^\d{4}-\d{2}-\d{2}$/
const wikilink = /^\[\[([a-z0-9]+(?:-[a-z0-9]+)*)\]\]$/

export type Field =
  | { type: "text"; required: boolean; allowedValues?: readonly string[]; maxLength?: number }
  | { type: "list"; required: boolean; itemPattern: RegExp; itemFormat: string }
  | { type: "date"; required: boolean }
  | { type: "link"; required: boolean }

export const parseWikilink = (value: string) => value.trim().match(wikilink)?.[1]

const isDate = (value: unknown) => {
  if (typeof value !== "string" || !isoDate.test(value)) return false

  const time = Date.parse(value)
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value)
}

const checkText = (key: string, field: Extract<Field, { type: "text" }>, value: unknown) => {
  if (field.allowedValues) {
    return field.allowedValues.includes(value as string) ? undefined : `${key} must be one of ${field.allowedValues.join(", ")}`
  }

  if (typeof value !== "string" || !value.trim() || value.includes("\n")) return `${key} must be one non-empty line`
  if (field.maxLength && value.length > field.maxLength) return `${key} must be at most ${field.maxLength} characters`

  return undefined
}

export const checkField = (key: string, field: Field, value: unknown) => {
  if (value === undefined) return field.required ? `${key} is required` : undefined

  if (field.type === "text") return checkText(key, field, value)

  if (field.type === "list") {
    const valid = Array.isArray(value) && value.every((entry) => typeof entry === "string" && field.itemPattern.test(entry))
    return valid ? undefined : `${key} must be a list of ${field.itemFormat} entries`
  }

  if (field.type === "date") return isDate(value) ? undefined : `${key} must be a date as YYYY-MM-DD`

  return typeof value === "string" && parseWikilink(value) ? undefined : `${key} must be a quoted "[[slug]]"`
}
