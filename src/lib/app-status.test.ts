import { describe, expect, it } from "vitest"
import { isChecking, toStatusSnapshot, type StatusRecord } from "./app-status"

const record: StatusRecord = {
  id: "plex0001",
  url: "http://plex",
  status: "up",
  lastCheckedAt: new Date(0),
  lastError: null,
  probeRequestedAt: null,
}

describe("saved app status", () => {
  it("is checking when pending, initially unchecked, or hourly due", () => {
    expect(isChecking({ ...record, lastCheckedAt: null }, new Date(1))).toBe(
      true,
    )
    expect(
      isChecking({ ...record, probeRequestedAt: new Date(1) }, new Date(1)),
    ).toBe(true)
    expect(isChecking(record, new Date(3_600_000))).toBe(true)
    expect(isChecking(record, new Date(3_599_999))).toBe(false)
  })
  it("serializes saved results with a single checking flag", () => {
    expect(toStatusSnapshot(record, new Date(1))).toEqual({
      id: "plex0001",
      status: "up",
      lastCheckedAt: 0,
      lastError: null,
      checking: false,
    })
  })
})
