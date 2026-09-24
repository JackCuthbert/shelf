import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { prisma } from "@/lib/prisma"
import { protectedProcedure, publicProcedure, router } from "@/server/trpc"
import { createBoardNanoid, moveItem } from "@/server/board-service"
import { createAppStatusService } from "@/server/app-status-service"

const appStatusService = createAppStatusService({
  listBoardApps: async (nanoid) => {
    const board = await prisma.board.findUnique({
      where: { nanoid },
      select: {
        apps: {
          select: {
            app: {
              select: {
                id: true,
                url: true,
                status: true,
                lastCheckedAt: true,
              },
            },
          },
        },
      },
    })
    if (!board) return null
    return board.apps.map(({ app }) => ({
      ...app,
      status:
        app.status === "up" || app.status === "down" ? app.status : "unknown",
    }))
  },
  isBoardAppAssigned: async (nanoid, appId) => {
    const board = await prisma.board.findUnique({
      where: { nanoid },
      select: { apps: { where: { appId }, select: { appId: true } } },
    })
    return Boolean(board?.apps.length)
  },
  updateStatus: async (id, status, lastCheckedAt) => {
    await prisma.app.update({
      where: { id },
      data: { status, lastCheckedAt },
    })
  },
})

const nameSchema = z.string().trim().min(1).max(80)

async function ownedBoard(id: string, ownerId: string) {
  const board = await prisma.board.findFirst({ where: { id, ownerId } })
  if (!board)
    throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." })
  return board
}

export const boardRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    prisma.board.findMany({
      where: { ownerId: ctx.session.user.id },
      include: {
        apps: { include: { app: true }, orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
  ),
  create: protectedProcedure
    .input(z.object({ name: nameSchema }))
    .mutation(async ({ ctx, input }) =>
      prisma.$transaction(async (tx) => {
        const board = await tx.board.create({
          data: {
            name: input.name,
            nanoid: createBoardNanoid(),
            ownerId: ctx.session.user.id,
          },
        })
        const user = await tx.user.findUniqueOrThrow({
          where: { id: ctx.session.user.id },
          select: { defaultBoardId: true },
        })
        if (!user.defaultBoardId)
          await tx.user.update({
            where: { id: ctx.session.user.id },
            data: { defaultBoardId: board.id },
          })
        return board
      }),
    ),
  rename: protectedProcedure
    .input(z.object({ id: z.string(), name: nameSchema }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.id, ctx.session.user.id)
      return prisma.board.update({
        where: { id: input.id },
        data: { name: input.name },
      })
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ownedBoard(input.id, ctx.session.user.id)
      return prisma.$transaction(async (tx) => {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: ctx.session.user.id },
          select: { defaultBoardId: true },
        })
        await tx.board.delete({ where: { id: board.id } })
        if (user.defaultBoardId === board.id) {
          const next = await tx.board.findFirst({
            where: { ownerId: ctx.session.user.id },
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
          })
          await tx.user.update({
            where: { id: ctx.session.user.id },
            data: { defaultBoardId: next?.id ?? null },
          })
        }
        return { success: true }
      })
    }),
  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.id, ctx.session.user.id)
      return prisma.user.update({
        where: { id: ctx.session.user.id },
        data: { defaultBoardId: input.id },
      })
    }),
  assign: protectedProcedure
    .input(z.object({ boardId: z.string(), appId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const existing = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
        select: { appId: true },
      })
      if (existing.some((entry) => entry.appId === input.appId))
        return { success: true }
      await prisma.$transaction(async (tx) => {
        await tx.boardApp.create({
          data: {
            boardId: input.boardId,
            appId: input.appId,
            position: existing.length + 1000000,
          },
        })
        await tx.boardApp.update({
          where: {
            boardId_appId: { boardId: input.boardId, appId: input.appId },
          },
          data: { position: existing.length },
        })
      })
      return { success: true }
    }),
  unassign: protectedProcedure
    .input(z.object({ boardId: z.string(), appId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const assignments = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
        select: { appId: true },
      })
      if (!assignments.some((entry) => entry.appId === input.appId))
        return { success: true }
      const remaining = assignments
        .filter((entry) => entry.appId !== input.appId)
        .map((entry) => entry.appId)
      await prisma.$transaction(async (tx) => {
        await tx.boardApp.update({
          where: {
            boardId_appId: { boardId: input.boardId, appId: input.appId },
          },
          data: { position: { increment: 1000000 } },
        })
        await tx.boardApp.delete({
          where: {
            boardId_appId: { boardId: input.boardId, appId: input.appId },
          },
        })
        await tx.boardApp.updateMany({
          where: { boardId: input.boardId },
          data: { position: { increment: 1000000 } },
        })
        for (const [position, appId] of remaining.entries())
          await tx.boardApp.update({
            where: { boardId_appId: { boardId: input.boardId, appId } },
            data: { position },
          })
      })
      return { success: true }
    }),
  move: protectedProcedure
    .input(
      z.object({
        boardId: z.string(),
        appId: z.string(),
        direction: z.enum(["up", "down"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const assignments = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
        select: { appId: true },
      })
      const index = assignments.findIndex(
        (entry) => entry.appId === input.appId,
      )
      if (index < 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App assignment not found.",
        })
      const moved = moveItem(
        assignments,
        index,
        input.direction === "up" ? -1 : 1,
      ).map((entry) => entry.appId)
      await prisma.$transaction(async (tx) => {
        await tx.boardApp.updateMany({
          where: { boardId: input.boardId },
          data: { position: { increment: 1000000 } },
        })
        for (const [position, appId] of moved.entries())
          await tx.boardApp.update({
            where: { boardId_appId: { boardId: input.boardId, appId } },
            data: { position },
          })
      })
      return { success: true }
    }),
  publicByNanoid: publicProcedure
    .input(z.object({ nanoid: z.string().min(8).max(30) }))
    .query(({ input }) =>
      prisma.board.findUnique({
        where: { nanoid: input.nanoid },
        include: {
          apps: { include: { app: true }, orderBy: { position: "asc" } },
        },
      }),
    ),
  refreshStatuses: publicProcedure
    .input(z.object({ nanoid: z.string().min(8).max(30) }))
    .mutation(async ({ input }) => {
      const statuses = await appStatusService.refreshBoard(input.nanoid)
      if (!statuses)
        throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." })
      return statuses.map((app) => ({
        ...app,
        lastCheckedAt: app.lastCheckedAt?.getTime() ?? null,
      }))
    }),
})
