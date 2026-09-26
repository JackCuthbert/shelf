import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { categoryInputSchema } from "@/lib/category-validation"
import { prisma } from "@/lib/prisma"
import { protectedProcedure, publicProcedure, router } from "@/server/trpc"
import {
  createBoardNanoid,
  moveItem,
  normalizeCategoryTitle,
  orderedBoardAssignmentIds,
  orderedGroupAssignmentIds,
  writeAssignmentPositions,
  writeCategoryPositions,
} from "@/server/board-service"
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
  updateStatus: async (id, status, lastCheckedAt, lastError) => {
    await prisma.app.update({
      where: { id },
      data: { status, lastCheckedAt, lastError },
    })
  },
})

const nameSchema = z.string().trim().min(1).max(80)
const boardIdSchema = z.string().min(1)
const categoryIdSchema = z.string().min(1).nullable()

async function ownedBoard(id: string, ownerId: string) {
  const board = await prisma.board.findFirst({ where: { id, ownerId } })
  if (!board)
    throw new TRPCError({ code: "NOT_FOUND", message: "Board not found." })
  return board
}

async function ownedCategory(id: string, ownerId: string) {
  const category = await prisma.boardCategory.findUnique({
    where: { id },
    include: { board: { select: { ownerId: true } } },
  })
  if (!category || category.board.ownerId !== ownerId)
    throw new TRPCError({ code: "NOT_FOUND", message: "Category not found." })
  return category
}

async function categoryOnBoard(categoryId: string | null, boardId: string) {
  if (categoryId === null) return
  const category = await prisma.boardCategory.findUnique({
    where: { id: categoryId },
    select: { boardId: true },
  })
  if (!category || category.boardId !== boardId)
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Choose a category from this board.",
    })
}

async function assertUniqueTitle(
  boardId: string,
  title: string,
  exceptId?: string,
) {
  const normalized = normalizeCategoryTitle(title)
  const categories = await prisma.boardCategory.findMany({
    where: { boardId },
    select: { id: true, title: true },
  })
  if (
    categories.some(
      (category) =>
        category.id !== exceptId &&
        normalizeCategoryTitle(category.title) === normalized,
    )
  )
    throw new TRPCError({
      code: "CONFLICT",
      message: "A category with that title already exists on this board.",
    })
}

export const boardRouter = router({
  list: protectedProcedure.query(({ ctx }) =>
    prisma.board.findMany({
      where: { ownerId: ctx.session.user.id },
      include: {
        categories: { orderBy: { position: "asc" } },
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
        await tx.board.delete({ where: { id: board.id } })
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
    .input(
      z.object({
        boardId: boardIdSchema,
        appId: z.string().min(1),
        categoryId: categoryIdSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const categoryId = input.categoryId ?? null
      await categoryOnBoard(categoryId, input.boardId)
      const existing = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
      })
      if (existing.some((entry) => entry.appId === input.appId))
        return { success: true }
      await prisma.$transaction(async (tx) => {
        const position =
          existing.reduce((max, entry) => Math.max(max, entry.position), -1) + 1
        await tx.boardApp.create({
          data: {
            boardId: input.boardId,
            appId: input.appId,
            categoryId,
            position,
          },
        })
        const categories = await tx.boardCategory.findMany({
          where: { boardId: input.boardId },
          orderBy: { position: "asc" },
          select: { id: true },
        })
        const assignments = [
          ...existing.map((entry) => ({
            appId: entry.appId,
            categoryId: entry.categoryId,
            position: entry.position,
          })),
          { appId: input.appId, categoryId, position },
        ]
        await writeAssignmentPositions(
          tx,
          input.boardId,
          orderedBoardAssignmentIds(
            assignments,
            categories.map((category) => category.id),
          ),
        )
      })
      return { success: true }
    }),
  unassign: protectedProcedure
    .input(z.object({ boardId: boardIdSchema, appId: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const assignments = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
      })
      if (!assignments.some((entry) => entry.appId === input.appId))
        return { success: true }
      const remaining = assignments
        .filter((entry) => entry.appId !== input.appId)
        .map((entry) => ({
          appId: entry.appId,
          categoryId: entry.categoryId,
          position: entry.position,
        }))
      await prisma.$transaction(async (tx) => {
        await tx.boardApp.delete({
          where: {
            boardId_appId: { boardId: input.boardId, appId: input.appId },
          },
        })
        const categories = await tx.boardCategory.findMany({
          where: { boardId: input.boardId },
          orderBy: { position: "asc" },
          select: { id: true },
        })
        await writeAssignmentPositions(
          tx,
          input.boardId,
          orderedBoardAssignmentIds(
            remaining,
            categories.map((category) => category.id),
          ),
        )
      })
      return { success: true }
    }),
  move: protectedProcedure
    .input(
      z.object({
        boardId: boardIdSchema,
        appId: z.string().min(1),
        direction: z.enum(["up", "down"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const assignments = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
      })
      const current = assignments.find((entry) => entry.appId === input.appId)
      if (!current)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App assignment not found.",
        })
      const categories = await prisma.boardCategory.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
        select: { id: true },
      })
      const categoryIds = categories.map((category) => category.id)
      const groupIds = orderedGroupAssignmentIds(
        assignments,
        current.categoryId,
      )
      const groupIndex = groupIds.indexOf(input.appId)
      const movedGroup = moveItem(
        groupIds,
        groupIndex,
        input.direction === "up" ? -1 : 1,
      )
      const nextOrder = [null, ...categoryIds].flatMap((categoryId) =>
        categoryId === current.categoryId
          ? movedGroup
          : orderedGroupAssignmentIds(assignments, categoryId),
      )
      await prisma.$transaction((tx) =>
        writeAssignmentPositions(tx, input.boardId, nextOrder),
      )
      return { success: true }
    }),
  setAssignmentCategory: protectedProcedure
    .input(
      z.object({
        boardId: boardIdSchema,
        appId: z.string().min(1),
        categoryId: categoryIdSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      await categoryOnBoard(input.categoryId, input.boardId)
      const assignments = await prisma.boardApp.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
      })
      if (!assignments.some((entry) => entry.appId === input.appId))
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "App assignment not found.",
        })
      const position =
        assignments.reduce((max, entry) => Math.max(max, entry.position), -1) +
        1
      await prisma.$transaction(async (tx) => {
        await tx.boardApp.update({
          where: {
            boardId_appId: { boardId: input.boardId, appId: input.appId },
          },
          data: { categoryId: input.categoryId, position },
        })
        const categories = await tx.boardCategory.findMany({
          where: { boardId: input.boardId },
          orderBy: { position: "asc" },
          select: { id: true },
        })
        const nextAssignments = assignments.map((entry) =>
          entry.appId === input.appId
            ? {
                appId: entry.appId,
                categoryId: input.categoryId,
                position,
              }
            : {
                appId: entry.appId,
                categoryId: entry.categoryId,
                position: entry.position,
              },
        )
        await writeAssignmentPositions(
          tx,
          input.boardId,
          orderedBoardAssignmentIds(
            nextAssignments,
            categories.map((category) => category.id),
          ),
        )
      })
      return { success: true }
    }),
  createCategory: protectedProcedure
    .input(z.object({ boardId: boardIdSchema, ...categoryInputSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      await assertUniqueTitle(input.boardId, input.title)
      const position = await prisma.boardCategory.count({
        where: { boardId: input.boardId },
      })
      return prisma.boardCategory.create({
        data: {
          boardId: input.boardId,
          title: input.title,
          description: input.description,
          position,
        },
      })
    }),
  updateCategory: protectedProcedure
    .input(z.object({ id: z.string().min(1), ...categoryInputSchema.shape }))
    .mutation(async ({ ctx, input }) => {
      const category = await ownedCategory(input.id, ctx.session.user.id)
      await assertUniqueTitle(category.boardId, input.title, category.id)
      return prisma.boardCategory.update({
        where: { id: category.id },
        data: { title: input.title, description: input.description },
      })
    }),
  moveCategory: protectedProcedure
    .input(
      z.object({
        boardId: boardIdSchema,
        id: z.string().min(1),
        direction: z.enum(["up", "down"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ownedBoard(input.boardId, ctx.session.user.id)
      const categories = await prisma.boardCategory.findMany({
        where: { boardId: input.boardId },
        orderBy: { position: "asc" },
        select: { id: true },
      })
      const index = categories.findIndex((category) => category.id === input.id)
      if (index < 0)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Category not found.",
        })
      const moved = moveItem(
        categories.map((category) => category.id),
        index,
        input.direction === "up" ? -1 : 1,
      )
      await prisma.$transaction((tx) =>
        writeCategoryPositions(tx, input.boardId, moved),
      )
      return { success: true }
    }),
  deleteCategory: protectedProcedure
    .input(z.object({ id: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      const category = await ownedCategory(input.id, ctx.session.user.id)
      await prisma.$transaction(async (tx) => {
        const assignments = await tx.boardApp.findMany({
          where: { boardId: category.boardId },
          orderBy: { position: "asc" },
        })
        const categories = await tx.boardCategory.findMany({
          where: { boardId: category.boardId },
          orderBy: { position: "asc" },
          select: { id: true },
        })
        const uncategorized = orderedGroupAssignmentIds(assignments, null)
        const deleted = orderedGroupAssignmentIds(assignments, category.id)
        const remaining = categories.filter((entry) => entry.id !== category.id)
        await tx.boardApp.updateMany({
          where: { boardId: category.boardId, categoryId: category.id },
          data: { categoryId: null },
        })
        await tx.boardCategory.delete({ where: { id: category.id } })
        const nextOrder = [
          ...uncategorized,
          ...deleted,
          ...remaining.flatMap((entry) =>
            orderedGroupAssignmentIds(assignments, entry.id),
          ),
        ]
        await writeAssignmentPositions(tx, category.boardId, nextOrder)
        await writeCategoryPositions(
          tx,
          category.boardId,
          remaining.map((entry) => entry.id),
        )
      })
      return { success: true }
    }),
  publicByNanoid: publicProcedure
    .input(z.object({ nanoid: z.string().min(8).max(30) }))
    .query(({ input }) =>
      prisma.board.findUnique({
        where: { nanoid: input.nanoid },
        include: {
          categories: { orderBy: { position: "asc" } },
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
