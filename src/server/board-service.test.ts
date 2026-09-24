import { describe, expect, it } from "vitest";
import { createBoardNanoid, moveItem, orderedPositions } from "./board-service";

describe("board public IDs", () => {
  it("generates eight URL-safe characters with fresh random values", () => {
    const ids = Array.from({ length: 100 }, createBoardNanoid);
    expect(ids.every((id) => /^[A-Za-z0-9_-]{8}$/.test(id))).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("board ordering", () => {
  it("assigns a contiguous persisted sequence", () => {
    expect(orderedPositions([{ id: "a" }, { id: "b" }])).toEqual([{ id: "a", position: 0 }, { id: "b", position: 1 }]);
  });
  it("moves one assignment up or down and keeps boundary moves stable", () => {
    expect(moveItem(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(moveItem(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b"], 0, -1)).toEqual(["a", "b"]);
  });
});
