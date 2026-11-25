import { expect, test } from "bun:test"
import { checkField } from "./field.ts"

test("checks a required field only when it is set or required", () => {
  expect(checkField("title", { type: "text", required: true }, undefined)).toBe("title is required")
  expect(checkField("title", { type: "text", required: false }, undefined)).toBeUndefined()
})

test("limits text to allowed values or one line of at most the max length", () => {
  const level = { type: "text", required: true, allowedValues: ["low", "high"] } as const
  const title = { type: "text", required: true, maxLength: 10 } as const

  expect(checkField("level", level, "high")).toBeUndefined()
  expect(checkField("level", level, "mid")).toBe("level must be one of low, high")
  expect(checkField("title", title, "Short")).toBeUndefined()
  expect(checkField("title", title, "Much too long")).toBe("title must be at most 10 characters")
  expect(checkField("title", title, "Two\nlines")).toBe("title must be one non-empty line")
})

test("checks list items, dates and links", () => {
  const list = { type: "list", required: false, itemPattern: /^\d+$/, itemFormat: "number" } as const

  expect(checkField("ids", list, ["1", "2"])).toBeUndefined()
  expect(checkField("ids", list, ["1", "x"])).toBe("ids must be a list of number entries")
  expect(checkField("on", { type: "date", required: true }, "2026-02-29")).toBe("on must be a date as YYYY-MM-DD")
  expect(checkField("next", { type: "link", required: false }, "[[other-doc]]")).toBeUndefined()
  expect(checkField("next", { type: "link", required: false }, "[[other-doc|x]]")).toBe('next must be a quoted "[[slug]]"')
})
