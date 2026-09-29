import { describe, expect, it } from "vitest"
import { formatLocalDateTime } from "./date-format"

describe("formatLocalDateTime", () => {
  it("formats a timestamp in the local timezone", () => {
    const originalTimeZone = process.env.TZ
    process.env.TZ = "Australia/Melbourne"
    try {
      expect(formatLocalDateTime("2026-09-24T00:00:00.000Z")).toBe(
        "24 September 2026 at 10:00 am",
      )
    } finally {
      if (originalTimeZone === undefined) delete process.env.TZ
      else process.env.TZ = originalTimeZone
    }
  })
})
