import { createRoute, z } from "@hono/zod-openapi"
import { TRPCError } from "@trpc/server"
import { categoryInputSchema } from "@/lib/category-validation"
import { prisma } from "@/lib/prisma"
import { boardRouter } from "@/server/routers/board"
import {
  orderedBoardAssignmentIds,
  writeAssignmentPositions,
  writeCategoryPositions,
} from "@/server/board-service"
import type { AgentApi } from "./app"
import { apiError, ErrorSchema } from "./errors"

const Id = z.string().min(1)
const BoardId = z.object({
  boardId: Id.openapi({ param: { name: "boardId", in: "path" } }),
})
const CategoryParams = z.object({
  boardId: Id.openapi({ param: { name: "boardId", in: "path" } }),
  categoryId: Id.openapi({ param: { name: "categoryId", in: "path" } }),
})
const AppParams = z.object({
  boardId: Id.openapi({ param: { name: "boardId", in: "path" } }),
  appId: Id.openapi({ param: { name: "appId", in: "path" } }),
})
const categoryExample = {
  id: "category_123",
  boardId: "board_123",
  title: "Media",
  description: "Entertainment apps",
  position: 0,
  createdAt: "2026-09-26T12:00:00.000Z",
  updatedAt: "2026-09-26T12:00:00.000Z",
}
const CategorySchema = z
  .object({
    id: z.string(),
    boardId: z.string(),
    title: z.string(),
    description: z.string(),
    position: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("BoardCategory", { example: categoryExample })
const boardAppExample = {
  id: "app_123",
  ownerId: "user_123",
  name: "Plex",
  description: "Media library",
  url: "https://plex.home",
  iconSource: "dashboard",
  iconSlug: "plex",
  customIconUrl: null,
  iconHash: null,
  iconUrl: "/icons/plex",
  status: "unknown",
  lastCheckedAt: null,
  lastError: null,
  createdAt: "2026-09-26T12:00:00.000Z",
  updatedAt: "2026-09-26T12:00:00.000Z",
  categoryId: null,
  position: 0,
}
const BoardAppSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string(),
    iconSource: z.string(),
    iconSlug: z.string().nullable(),
    customIconUrl: z.string().nullable(),
    iconHash: z.string().nullable(),
    iconUrl: z.string(),
    status: z.string(),
    lastCheckedAt: z.string().nullable(),
    lastError: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
    categoryId: z.string().nullable(),
    position: z.number(),
  })
  .openapi("BoardApp", { example: boardAppExample })
const boardExample = {
  id: "board_123",
  nanoid: "AbCd1234",
  url: "/board/AbCd1234",
  name: "Home",
  isDefault: true,
  createdAt: "2026-09-26T12:00:00.000Z",
  categories: [categoryExample],
  apps: [boardAppExample],
}
const BoardSchema = z
  .object({
    id: z.string(),
    nanoid: z.string(),
    url: z.string(),
    name: z.string(),
    isDefault: z.boolean(),
    createdAt: z.string(),
    categories: z.array(CategorySchema),
    apps: z.array(BoardAppSchema),
  })
  .openapi("Board", { example: boardExample })
const errors = {
  400: {
    description: "Invalid request",
    content: { "application/json": { schema: ErrorSchema } },
  },
  401: {
    description: "Unauthorized",
    content: { "application/json": { schema: ErrorSchema } },
  },
  404: {
    description: "Not found",
    content: { "application/json": { schema: ErrorSchema } },
  },
  409: {
    description: "Conflict",
    content: { "application/json": { schema: ErrorSchema } },
  },
  500: {
    description: "Unexpected error",
    content: { "application/json": { schema: ErrorSchema } },
  },
}
function caller(userId: string) {
  return boardRouter.createCaller({
    session: { user: { id: userId } } as never,
  })
}
async function boardData(userId: string, id: string) {
  const board = await prisma.board.findFirst({
    where: { id, ownerId: userId },
    include: {
      categories: { orderBy: { position: "asc" } },
      apps: { include: { app: true }, orderBy: { position: "asc" } },
    },
  })
  if (!board) return null
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { defaultBoardId: true },
  })
  return {
    id: board.id,
    nanoid: board.id,
    url: `/board/${board.id}`,
    name: board.name,
    isDefault: user?.defaultBoardId === board.id,
    createdAt: board.createdAt.toISOString(),
    categories: board.categories.map((x) => ({
      ...x,
      createdAt: x.createdAt.toISOString(),
      updatedAt: x.updatedAt.toISOString(),
    })),
    apps: board.apps.map((x) => ({
      ...x.app,
      iconUrl: `/icons/${x.app.iconSource === "url" ? x.app.iconHash : x.app.iconSlug}`,
      createdAt: x.app.createdAt.toISOString(),
      updatedAt: x.app.updatedAt.toISOString(),
      lastCheckedAt: x.app.lastCheckedAt?.toISOString() ?? null,
      categoryId: x.categoryId,
      position: x.position,
    })),
  }
}
function fail(
  c: Parameters<Parameters<AgentApi["onError"]>[0]>[1],
  error: unknown,
) {
  if (error instanceof TRPCError) {
    const status =
      error.code === "NOT_FOUND" ? 404 : error.code === "CONFLICT" ? 409 : 400
    return apiError(status, error.code, error.message)
  }
  return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
}

function register(app: AgentApi, route: any, handler: (c: any) => any) {
  ;(app.openapi as any)(route, handler)
}
export function registerBoardRoutes(app: AgentApi) {
  register(
    app,
    createRoute({
      method: "get",
      path: "/api/v1/boards",
      security: [{ Bearer: [] }],
      responses: {
        200: {
          description: "Owned boards",
          content: { "application/json": { schema: z.array(BoardSchema) } },
        },
        ...errors,
      },
    }),
    async (c) => {
      const list = await caller(c.get("apiUser").id).list()
      return c.json(
        await Promise.all(
          list.map((b) => boardData(c.get("apiUser").id, b.id)),
        ),
        200,
      )
    },
  )
  register(
    app,
    createRoute({
      method: "post",
      path: "/api/v1/boards",
      security: [{ Bearer: [] }],
      request: {
        body: {
          content: {
            "application/json": {
              schema: z
                .object({ name: z.string().trim().min(1).max(80) })
                .openapi({ example: { name: "Home" } }),
            },
          },
          required: true,
        },
      },
      responses: {
        201: {
          description: "Created board",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const b = await caller(c.get("apiUser").id).create(c.req.valid("json"))
        return c.json(await boardData(c.get("apiUser").id, b.id), 201)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "get",
      path: "/api/v1/boards/{boardId}",
      security: [{ Bearer: [] }],
      request: { params: BoardId },
      responses: {
        200: {
          description: "Owned board",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      const b = await boardData(
        c.get("apiUser").id,
        c.req.valid("param").boardId,
      )
      return b ? c.json(b, 200) : apiError(404, "NOT_FOUND", "Board not found.")
    },
  )
  register(
    app,
    createRoute({
      method: "patch",
      path: "/api/v1/boards/{boardId}",
      security: [{ Bearer: [] }],
      request: {
        params: BoardId,
        body: {
          content: {
            "application/json": {
              schema: z
                .object({ name: z.string().trim().min(1).max(80) })
                .openapi({ example: { name: "Home" } }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Renamed board",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const id = c.req.valid("param").boardId
        await caller(c.get("apiUser").id).rename({ id, ...c.req.valid("json") })
        return c.json(await boardData(c.get("apiUser").id, id), 200)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "delete",
      path: "/api/v1/boards/{boardId}",
      security: [{ Bearer: [] }],
      request: { params: BoardId },
      responses: { 204: { description: "Deleted" }, ...errors },
    }),
    async (c) => {
      try {
        await caller(c.get("apiUser").id).delete({
          id: c.req.valid("param").boardId,
        })
        return c.body(null, 204)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "put",
      path: "/api/v1/boards/{boardId}/default",
      security: [{ Bearer: [] }],
      request: { params: BoardId },
      responses: {
        200: {
          description: "Default board",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const id = c.req.valid("param").boardId
        await caller(c.get("apiUser").id).setDefault({ id })
        return c.json(await boardData(c.get("apiUser").id, id), 200)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "post",
      path: "/api/v1/boards/{boardId}/categories",
      security: [{ Bearer: [] }],
      request: {
        params: BoardId,
        body: {
          content: {
            "application/json": {
              schema: categoryInputSchema.openapi({
                example: { title: "Media", description: "Entertainment apps" },
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        201: {
          description: "Created category",
          content: { "application/json": { schema: CategorySchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        return c.json(
          await caller(c.get("apiUser").id).createCategory({
            boardId: c.req.valid("param").boardId,
            ...c.req.valid("json"),
          }),
          201,
        )
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "patch",
      path: "/api/v1/boards/{boardId}/categories/{categoryId}",
      security: [{ Bearer: [] }],
      request: {
        params: CategoryParams,
        body: {
          content: {
            "application/json": {
              schema: categoryInputSchema
                .partial()
                .refine((x) => Object.keys(x).length > 0)
                .openapi({
                  example: {
                    title: "Media",
                    description: "Entertainment apps",
                  },
                }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Updated category",
          content: { "application/json": { schema: CategorySchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const p = c.req.valid("param")
        const prior = await prisma.boardCategory.findFirst({
          where: {
            id: p.categoryId,
            boardId: p.boardId,
            board: { ownerId: c.get("apiUser").id },
          },
        })
        if (!prior) return apiError(404, "NOT_FOUND", "Category not found.")
        const patch = c.req.valid("json")
        return c.json(
          await caller(c.get("apiUser").id).updateCategory({
            id: p.categoryId,
            title: patch.title ?? prior.title,
            description: patch.description ?? prior.description,
          }),
          200,
        )
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "delete",
      path: "/api/v1/boards/{boardId}/categories/{categoryId}",
      security: [{ Bearer: [] }],
      request: { params: CategoryParams },
      responses: { 204: { description: "Deleted" }, ...errors },
    }),
    async (c) => {
      try {
        const p = c.req.valid("param")
        const cat = await prisma.boardCategory.findFirst({
          where: {
            id: p.categoryId,
            boardId: p.boardId,
            board: { ownerId: c.get("apiUser").id },
          },
        })
        if (!cat) return apiError(404, "NOT_FOUND", "Category not found.")
        await caller(c.get("apiUser").id).deleteCategory({ id: p.categoryId })
        return c.body(null, 204)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "put",
      path: "/api/v1/boards/{boardId}/categories/order",
      security: [{ Bearer: [] }],
      request: {
        params: BoardId,
        body: {
          content: {
            "application/json": {
              schema: z.object({ categoryIds: z.array(Id) }).openapi({
                example: { categoryIds: ["category_123", "category_456"] },
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Order saved",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      const id = c.req.valid("param").boardId
      const userId = c.get("apiUser").id
      const b = await prisma.board.findFirst({ where: { id, ownerId: userId } })
      if (!b) return apiError(404, "NOT_FOUND", "Board not found.")
      const body = c.req.valid("json")
      const cats = await prisma.boardCategory.findMany({
        where: { boardId: id },
        orderBy: { position: "asc" },
        select: { id: true },
      })
      if (
        new Set(body.categoryIds).size !== cats.length ||
        body.categoryIds.length !== cats.length ||
        cats.some((x) => !body.categoryIds.includes(x.id))
      )
        return apiError(
          400,
          "BAD_REQUEST",
          "categoryIds must be a complete permutation.",
        )
      await prisma.$transaction((tx) =>
        writeCategoryPositions(tx, id, body.categoryIds),
      )
      return c.json(await boardData(userId, id), 200)
    },
  )
  register(
    app,
    createRoute({
      method: "post",
      path: "/api/v1/boards/{boardId}/apps",
      security: [{ Bearer: [] }],
      request: {
        params: BoardId,
        body: {
          content: {
            "application/json": {
              schema: z
                .object({ appId: Id, categoryId: Id.nullish() })
                .openapi({ example: { appId: "app_123", categoryId: null } }),
            },
          },
          required: true,
        },
      },
      responses: {
        201: {
          description: "Assigned app",
          content: { "application/json": { schema: BoardAppSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const p = c.req.valid("param")
        const input = c.req.valid("json")
        const ownerId = c.get("apiUser").id
        const board = await prisma.board.findFirst({
          where: { id: p.boardId, ownerId },
        })
        if (!board) return apiError(404, "NOT_FOUND", "Board not found.")
        if (!(await prisma.app.findUnique({ where: { id: input.appId } })))
          return apiError(404, "NOT_FOUND", "App not found.")
        if (
          await prisma.boardApp.findUnique({
            where: {
              boardId_appId: { boardId: p.boardId, appId: input.appId },
            },
          })
        )
          return apiError(
            409,
            "CONFLICT",
            "App is already assigned to this board.",
          )
        await caller(ownerId).assign({
          boardId: p.boardId,
          appId: input.appId,
          categoryId: input.categoryId ?? null,
        })
        const b = await boardData(ownerId, p.boardId)
        const item = b?.apps.find((a) => a.id === input.appId)
        return item
          ? c.json(item, 201)
          : apiError(404, "NOT_FOUND", "App not found.")
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "patch",
      path: "/api/v1/boards/{boardId}/apps/{appId}",
      security: [{ Bearer: [] }],
      request: {
        params: AppParams,
        body: {
          content: {
            "application/json": {
              schema: z
                .object({ categoryId: Id.nullable() })
                .openapi({ example: { categoryId: "category_123" } }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Updated assignment",
          content: { "application/json": { schema: BoardAppSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        const p = c.req.valid("param")
        const b = await prisma.board.findFirst({
          where: { id: p.boardId, ownerId: c.get("apiUser").id },
        })
        if (!b) return apiError(404, "NOT_FOUND", "Board not found.")
        await caller(c.get("apiUser").id).setAssignmentCategory({
          boardId: p.boardId,
          appId: p.appId,
          categoryId: c.req.valid("json").categoryId,
        })
        const data = await boardData(c.get("apiUser").id, p.boardId)
        const item = data?.apps.find((a) => a.id === p.appId)
        return item
          ? c.json(item, 200)
          : apiError(404, "NOT_FOUND", "App assignment not found.")
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "delete",
      path: "/api/v1/boards/{boardId}/apps/{appId}",
      security: [{ Bearer: [] }],
      request: { params: AppParams },
      responses: { 204: { description: "Unassigned" }, ...errors },
    }),
    async (c) => {
      try {
        const p = c.req.valid("param")
        const b = await prisma.board.findFirst({
          where: { id: p.boardId, ownerId: c.get("apiUser").id },
        })
        if (!b) return apiError(404, "NOT_FOUND", "Board not found.")
        const assigned = await prisma.boardApp.findUnique({
          where: { boardId_appId: { boardId: p.boardId, appId: p.appId } },
        })
        if (!assigned)
          return apiError(404, "NOT_FOUND", "App assignment not found.")
        await caller(c.get("apiUser").id).unassign({
          boardId: p.boardId,
          appId: p.appId,
        })
        return c.body(null, 204)
      } catch (e) {
        return fail(c, e)
      }
    },
  )
  register(
    app,
    createRoute({
      method: "put",
      path: "/api/v1/boards/{boardId}/apps/order",
      security: [{ Bearer: [] }],
      request: {
        params: BoardId,
        body: {
          content: {
            "application/json": {
              schema: z
                .object({ appIds: z.array(Id) })
                .openapi({ example: { appIds: ["app_123", "app_456"] } }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Order saved",
          content: { "application/json": { schema: BoardSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      const id = c.req.valid("param").boardId
      const userId = c.get("apiUser").id
      const b = await prisma.board.findFirst({ where: { id, ownerId: userId } })
      if (!b) return apiError(404, "NOT_FOUND", "Board not found.")
      const body = c.req.valid("json")
      const [assignments, cats] = await Promise.all([
        prisma.boardApp.findMany({
          where: { boardId: id },
          orderBy: { position: "asc" },
        }),
        prisma.boardCategory.findMany({
          where: { boardId: id },
          orderBy: { position: "asc" },
          select: { id: true },
        }),
      ])
      const expected = orderedBoardAssignmentIds(
        assignments,
        cats.map((x) => x.id),
      )
      const byId = new Map(
        assignments.map((x) => [
          x.appId,
          cats.findIndex((group) => group.id === x.categoryId),
        ]),
      )
      if (
        body.appIds.length !== expected.length ||
        new Set(body.appIds).size !== expected.length ||
        expected.some((x) => !body.appIds.includes(x)) ||
        body.appIds.some(
          (x: string, i: number) =>
            i > 0 && (byId.get(body.appIds[i - 1]) ?? -1) > (byId.get(x) ?? -1),
        )
      )
        return apiError(
          400,
          "BAD_REQUEST",
          "appIds must be a complete permutation in display group order.",
        )
      await prisma.$transaction((tx) =>
        writeAssignmentPositions(tx, id, body.appIds),
      )
      return c.json(await boardData(userId, id), 200)
    },
  )
}
