import { describe, expect, it } from "vitest"
import { appRouterRoot } from "./root"

describe("board category authentication", () => {
  const caller = appRouterRoot.createCaller({ session: null })

  it.each([
    [
      "createCategory",
      () =>
        caller.boards.createCategory({ boardId: "board-1", title: "Media" }),
    ],
    [
      "updateCategory",
      () => caller.boards.updateCategory({ id: "category-1", title: "Media" }),
    ],
    [
      "moveCategory",
      () =>
        caller.boards.moveCategory({
          boardId: "board-1",
          id: "category-1",
          direction: "up",
        }),
    ],
    [
      "deleteCategory",
      () => caller.boards.deleteCategory({ id: "category-1" }),
    ],
    [
      "setAssignmentCategory",
      () =>
        caller.boards.setAssignmentCategory({
          boardId: "board-1",
          appId: "app-1",
          categoryId: null,
        }),
    ],
  ])("rejects anonymous %s calls", async (_name, request) => {
    await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
