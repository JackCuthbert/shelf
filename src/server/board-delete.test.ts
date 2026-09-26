import { expect, it, vi } from "vitest"
import type { TRPCContext } from "./trpc"

const { prismaMock, txMock } = vi.hoisted(() => {
  const txMock = {
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
    },
    board: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  }
  return {
    txMock,
    prismaMock: {
      board: { findFirst: vi.fn() },
      $transaction: vi.fn((operation) => operation(txMock)),
    },
  }
})

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))

import { appRouterRoot } from "./root"

it("clears the default before deleting a user's final board", async () => {
  prismaMock.board.findFirst.mockResolvedValue({ id: "board-1" })
  txMock.user.findUniqueOrThrow.mockResolvedValue({ defaultBoardId: "board-1" })
  txMock.board.findFirst.mockImplementation(({ where }) =>
    where.id?.not === "board-1" ? null : { id: "board-1" },
  )
  let defaultBoardId = "board-1"
  txMock.user.update.mockImplementation(({ data }) => {
    defaultBoardId = data.defaultBoardId
  })
  txMock.board.delete.mockImplementation(() => {
    if (defaultBoardId === "board-1") throw new Error("Foreign key constraint")
  })

  const session = { user: { id: "user-1" } } as TRPCContext["session"]
  const caller = appRouterRoot.createCaller({ session })
  await expect(caller.boards.delete({ id: "board-1" })).resolves.toEqual({
    success: true,
  })
  expect(defaultBoardId).toBeNull()
  expect(txMock.board.delete).toHaveBeenCalledWith({ where: { id: "board-1" } })
})
