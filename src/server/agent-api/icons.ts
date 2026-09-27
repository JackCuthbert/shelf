import { createRoute, z } from "@hono/zod-openapi"
import type { AgentApi } from "./app"
import { apiError, ErrorSchema } from "./errors"

type Icon = { slug: string; base: string; aliases: string[] }
let catalogue: Promise<Icon[]> | undefined
async function loadCatalogue(): Promise<Icon[]> {
  catalogue ??= fetch(
    "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json",
    { signal: AbortSignal.timeout(15000) },
  )
    .then(async (r) => {
      if (!r.ok) throw new Error(`Catalogue returned HTTP ${r.status}.`)
      const data: unknown = await r.json()
      if (!data || typeof data !== "object")
        throw new Error("Catalogue response was invalid.")
      return Object.entries(data)
        .map(([slug, value]) => ({
          slug,
          base:
            value &&
            typeof value === "object" &&
            "base" in value &&
            typeof value.base === "string"
              ? value.base
              : "png",
          aliases:
            value &&
            typeof value === "object" &&
            "aliases" in value &&
            Array.isArray(value.aliases)
              ? value.aliases.filter(
                  (x: unknown): x is string => typeof x === "string",
                )
              : [],
        }))
        .sort((a, b) => a.slug.localeCompare(b.slug))
    })
    .catch((e) => {
      catalogue = undefined
      throw e
    })
  return catalogue
}
const Query = z.object({
  q: z
    .string()
    .trim()
    .min(1)
    .openapi({ param: { name: "q", in: "query" }, example: "home" }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(60)
    .default(20)
    .openapi({ param: { name: "limit", in: "query" }, example: 20 }),
})
const Result = z
  .array(
    z.object({
      slug: z.string(),
      aliases: z.array(z.string()),
      previewUrl: z.string(),
    }),
  )
  .openapi("IconSearchResults", {
    example: [
      {
        slug: "plex",
        aliases: ["media server"],
        previewUrl:
          "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
      },
    ],
  })

function register(app: AgentApi, route: any, handler: (c: any) => any) {
  ;(app.openapi as any)(route, handler)
}
export function registerIconRoutes(app: AgentApi) {
  register(
    app,
    createRoute({
      method: "get",
      path: "/api/v1/icons/search",
      security: [{ Bearer: [] }],
      request: { query: Query },
      responses: {
        200: {
          description: "Matching Dashboard Icons",
          content: { "application/json": { schema: Result } },
        },
        400: {
          description: "Invalid query",
          content: { "application/json": { schema: ErrorSchema } },
        },
        401: {
          description: "Unauthorized",
          content: { "application/json": { schema: ErrorSchema } },
        },
        502: {
          description: "Catalogue unavailable",
          content: { "application/json": { schema: ErrorSchema } },
        },
        500: {
          description: "Unexpected error",
          content: { "application/json": { schema: ErrorSchema } },
        },
      },
    }),
    async (c) => {
      const { q, limit } = c.req.valid("query")
      try {
        const query = q.toLocaleLowerCase()
        const matches = (await loadCatalogue()).filter(
          (icon) =>
            icon.slug.toLocaleLowerCase().includes(query) ||
            icon.aliases.some((alias) =>
              alias.toLocaleLowerCase().includes(query),
            ),
        )
        return c.json(
          matches.slice(0, limit).map(({ slug, base, aliases }) => ({
            slug,
            aliases,
            previewUrl: `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/${base}/${slug}.${base}`,
          })),
          200,
        )
      } catch {
        return apiError(
          502,
          "ICON_CATALOGUE_UNAVAILABLE",
          "The Dashboard Icons catalogue is unavailable.",
        )
      }
    },
  )
}
