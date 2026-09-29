import { createRoute, z } from "@hono/zod-openapi"
import { appInputSchema } from "@/lib/app-validation"
import { IconDownloadError } from "@/lib/icon-cache"
import { sharedAppService } from "@/server/shared-apps"
import {
  AppForbiddenError,
  AppNotFoundError,
  AppUrlConflictError,
} from "@/server/app-service"
import type { AgentApi } from "./app"
import { apiError, ErrorSchema } from "./errors"

const appExample = {
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
}
const AppSchema = z
  .object({
    id: z.string(),
    ownerId: z.string(),
    name: z.string(),
    description: z.string(),
    url: z.string(),
    iconSource: z.enum(["dashboard", "url"]),
    iconSlug: z.string().nullable(),
    customIconUrl: z.string().nullable(),
    iconHash: z.string().nullable(),
    iconUrl: z.string(),
    status: z.string(),
    lastCheckedAt: z.string().nullable(),
    lastError: z.string().nullable(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .openapi("App", { example: appExample })
const AppInputSchema = appInputSchema.and(z.object({ description: z.string() }))
const appDto = (
  a: NonNullable<Awaited<ReturnType<typeof sharedAppService.get>>>,
) => ({
  id: a.id,
  ownerId: a.ownerId,
  name: a.name,
  description: a.description,
  url: a.url,
  iconSource: a.iconSource,
  iconSlug: a.iconSlug,
  customIconUrl: a.customIconUrl,
  iconHash: a.iconHash,
  status: a.status,
  lastError: a.lastError,
  iconUrl: `/icons/${a.iconSource === "url" ? a.iconHash : a.iconSlug}`,
  lastCheckedAt: a.lastCheckedAt?.toISOString() ?? null,
  createdAt: a.createdAt.toISOString(),
  updatedAt: a.updatedAt.toISOString(),
})
const idParams = z.object({
  appId: z
    .string()
    .min(1)
    .openapi({ param: { name: "appId", in: "path" } }),
})
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
  403: {
    description: "Only the app owner can change this app",
    content: { "application/json": { schema: ErrorSchema } },
  },
  409: {
    description: "App URL already exists",
    content: { "application/json": { schema: ErrorSchema } },
  },
  502: {
    description: "Icon download failed",
    content: { "application/json": { schema: ErrorSchema } },
  },
  500: {
    description: "Unexpected error",
    content: { "application/json": { schema: ErrorSchema } },
  },
}

function register(app: AgentApi, route: any, handler: (c: any) => any) {
  ;(app.openapi as any)(route, handler)
}
export function registerAppRoutes(app: AgentApi) {
  register(
    app,
    createRoute({
      method: "get",
      path: "/api/v1/apps",
      security: [{ Bearer: [] }],
      responses: {
        200: {
          description: "Shared apps",
          content: {
            "application/json": {
              schema: z.array(AppSchema).openapi({ example: [appExample] }),
            },
          },
        },
        ...errors,
      },
    }),
    async (c) => c.json((await sharedAppService.list()).map(appDto), 200),
  )
  register(
    app,
    createRoute({
      method: "post",
      path: "/api/v1/apps",
      security: [{ Bearer: [] }],
      request: {
        body: {
          content: {
            "application/json": {
              schema: AppInputSchema.openapi({
                example: {
                  name: "Plex",
                  description: "Media library",
                  url: "https://plex.home",
                  iconSource: "dashboard",
                  iconSlug: "plex",
                },
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        201: {
          description: "Created app",
          content: { "application/json": { schema: AppSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        return c.json(
          appDto(
            await sharedAppService.create(
              c.req.valid("json"),
              c.get("apiUser").id,
            ),
          ),
          201,
        )
      } catch (e) {
        if (e instanceof AppUrlConflictError)
          return apiError(409, "CONFLICT", e.message)
        return e instanceof IconDownloadError
          ? apiError(502, "ICON_FETCH_FAILED", e.message)
          : apiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
      }
    },
  )
  register(
    app,
    createRoute({
      method: "get",
      path: "/api/v1/apps/{appId}",
      security: [{ Bearer: [] }],
      request: { params: idParams },
      responses: {
        200: {
          description: "App",
          content: { "application/json": { schema: AppSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      const result = await sharedAppService.get(c.req.valid("param").appId)
      return result
        ? c.json(appDto(result), 200)
        : apiError(404, "NOT_FOUND", "App not found.")
    },
  )
  register(
    app,
    createRoute({
      method: "put",
      path: "/api/v1/apps/{appId}",
      security: [{ Bearer: [] }],
      request: {
        params: idParams,
        body: {
          content: {
            "application/json": {
              schema: AppInputSchema.openapi({
                example: {
                  name: "Plex",
                  description: "Media library",
                  url: "https://plex.home",
                  iconSource: "dashboard",
                  iconSlug: "plex",
                },
              }),
            },
          },
          required: true,
        },
      },
      responses: {
        200: {
          description: "Updated app",
          content: { "application/json": { schema: AppSchema } },
        },
        ...errors,
      },
    }),
    async (c) => {
      try {
        return c.json(
          appDto(
            await sharedAppService.update(
              {
                ...c.req.valid("json"),
                id: c.req.valid("param").appId,
              },
              c.get("apiUser").id,
            ),
          ),
          200,
        )
      } catch (e) {
        if (e instanceof AppNotFoundError)
          return apiError(404, "NOT_FOUND", e.message)
        if (e instanceof AppForbiddenError)
          return apiError(403, "FORBIDDEN", e.message)
        if (e instanceof AppUrlConflictError)
          return apiError(409, "CONFLICT", e.message)
        return e instanceof IconDownloadError
          ? apiError(502, "ICON_FETCH_FAILED", e.message)
          : apiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
      }
    },
  )
  register(
    app,
    createRoute({
      method: "delete",
      path: "/api/v1/apps/{appId}",
      security: [{ Bearer: [] }],
      request: { params: idParams },
      responses: { 204: { description: "Deleted" }, ...errors },
    }),
    async (c) => {
      try {
        await sharedAppService.delete(
          c.req.valid("param").appId,
          c.get("apiUser").id,
        )
        return c.body(null, 204)
      } catch (e) {
        if (e instanceof AppNotFoundError)
          return apiError(404, "NOT_FOUND", e.message)
        if (e instanceof AppForbiddenError)
          return apiError(403, "FORBIDDEN", e.message)
        return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
      }
    },
  )
}
