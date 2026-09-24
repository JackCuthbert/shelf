import { describe, expect, it } from "vitest";
import { moveItem, orderedPositions } from "./board-service";

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
