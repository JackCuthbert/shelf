import { describe, expect, it } from "vitest"
import {
  createBoardNanoid,
  moveItem,
  normalizeCategoryTitle,
  orderedBoardAssignmentIds,
  orderedGroupAssignmentIds,
  orderedPositions,
} from "./board-service"

describe("board public IDs", () => {
  it("generates eight URL-safe characters with fresh random values", () => {
    const ids = Array.from({ length: 100 }, createBoardNanoid)
    expect(ids.every((id) => /^[A-Za-z0-9_-]{8}$/.test(id))).toBe(true)
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("board ordering", () => {
  it("assigns a contiguous persisted sequence", () => {
    expect(orderedPositions([{ id: "a" }, { id: "b" }])).toEqual([
      { id: "a", position: 0 },
      { id: "b", position: 1 },
    ])
  })
  it("moves one assignment up or down and keeps boundary moves stable", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"])
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"])
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"])
  })
})

describe("category grouping and ordering", () => {
  const assignments = [
    { appId: "uncategorized-2", categoryId: null, position: 3 },
    { appId: "media-2", categoryId: "media", position: 0 },
    { appId: "uncategorized-1", categoryId: null, position: 1 },
    { appId: "media-1", categoryId: "media", position: 4 },
    { appId: "tools-1", categoryId: "tools", position: 2 },
  ]

  it("orders each group by persisted position", () => {
    expect(orderedGroupAssignmentIds(assignments, "media")).toEqual([
      "media-2",
      "media-1",
    ])
    expect(orderedGroupAssignmentIds(assignments, null)).toEqual([
      "uncategorized-1",
      "uncategorized-2",
    ])
  })

  it("flattens uncategorized first, then categories in the given order", () => {
    expect(orderedBoardAssignmentIds(assignments, ["tools", "media"])).toEqual([
      "uncategorized-1",
      "uncategorized-2",
      "tools-1",
      "media-2",
      "media-1",
    ])
  })

  it("normalizes titles for case-insensitive uniqueness checks", () => {
    expect(normalizeCategoryTitle("  Media  ")).toBe("media")
    expect(normalizeCategoryTitle("MEDIA")).toBe(
      normalizeCategoryTitle("media"),
    )
  })
})
