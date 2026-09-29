import { describe, expect, it, vi } from "vitest"
import { appRouterRoot } from "../root"

const statusMocks = vi.hoisted(() => ({
  boardStatuses: vi.fn(async () => null),
}))
vi.mock("@/server/apps/status", () => ({ appStatusService: statusMocks }))

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

describe("board status snapshots", () => {
  const caller = appRouterRoot.createCaller({ session: null })

  it("returns the saved snapshot array and verifies a missing board", async () => {
    statusMocks.boardStatuses.mockResolvedValueOnce([
      {
        id: "app00001",
        status: "up",
        lastCheckedAt: 0,
        lastError: null,
        checking: false,
      },
    ] as never)
    await expect(
      caller.boards.refreshStatuses({ nanoid: "abcdefgh" }),
    ).resolves.toMatchObject([
      { id: "app00001", lastCheckedAt: 0, checking: false },
    ])
    statusMocks.boardStatuses.mockResolvedValueOnce(null)
    await expect(
      caller.boards.refreshStatuses({ nanoid: "abcdefgh" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
