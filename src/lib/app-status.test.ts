import { describe, expect, it } from "vitest"
import {
  isChecking,
  parseStatusCheckIntervalSeconds,
  toStatusSnapshot,
  type StatusRecord,
} from "./app-status"

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
      checkIntervalSeconds: 3600,
    })
  })

  it("uses the configured interval for checking and snapshots", () => {
    expect(isChecking(record, new Date(59_999), 60)).toBe(false)
    expect(isChecking(record, new Date(60_000), 60)).toBe(true)
    expect(toStatusSnapshot(record, new Date(1), 60)).toMatchObject({
      checking: false,
      checkIntervalSeconds: 60,
    })
  })
})

describe("status check interval configuration", () => {
  it.each([
    [undefined, 3600],
    ["60", 60],
    ["9007199254740", 9007199254740],
  ])("parses %s seconds", (value, expected) => {
    expect(parseStatusCheckIntervalSeconds(value)).toBe(expected)
  })

  it.each([
    "",
    "59",
    "9007199254741",
    "1.5",
    "-60",
    "+60",
    "1e3",
    " 60",
    "60 ",
  ])("rejects invalid value %j with a clear setting name", (value) => {
    expect(() => parseStatusCheckIntervalSeconds(value)).toThrow(
      "APP_STATUS_CHECK_INTERVAL_SECONDS",
    )
  })
})
