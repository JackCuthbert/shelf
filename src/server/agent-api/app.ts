import { OpenAPIHono } from "@hono/zod-openapi"
import { apiError } from "./errors"
import { resolveApiUser } from "./auth"

export type ApiUser = { id: string }
type Env = { Variables: { apiUser: ApiUser } }
export type AgentApi = OpenAPIHono<Env>
type Resolver = (headers: Headers) => Promise<ApiUser | null>

export function createAgentApi(
  resolveUser: Resolver = resolveApiUser,
): AgentApi {
  const app = new OpenAPIHono<Env>({
    defaultHook: (result, c) =>
      result.success
        ? undefined
        : c.json(
            {
              error: {
                code: "BAD_REQUEST",
                message: "Request validation failed.",
                details: result.error.issues,
              },
            },
            400,
          ),
  })
  app.openAPIRegistry.registerComponent("securitySchemes", "Bearer", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "Shelf API key",
  })
  app.doc("/api/v1/openapi.json", {
    openapi: "3.1.0",
    info: { title: "Shelf Agent API", version: "1.0.0" },
    servers: [{ url: "/" }],
  })
  app.use("/api/v1/*", async (c, next) => {
    if (c.req.path === "/api/v1/openapi.json") return next()
    const user = await resolveUser(c.req.raw.headers)
    if (!user)
      return c.json(
        {
          error: {
            code: "UNAUTHORIZED",
            message: "A valid bearer API key is required.",
          },
        },
        401,
      )
    c.set("apiUser", user)
    return next()
  })
  app.onError((error, _c) => {
    if (
      error.name === "HTTPException" &&
      "status" in error &&
      error.status === 404
    )
      return apiError(404, "NOT_FOUND", "Resource not found.")
    if (error.name === "ZodError")
      return apiError(
        400,
        "BAD_REQUEST",
        "Request validation failed.",
        "issues" in error ? error.issues : undefined,
      )
    return apiError(500, "INTERNAL_ERROR", "An unexpected error occurred.")
  })
  app.notFound((_c) => apiError(404, "NOT_FOUND", "Resource not found."))
  return app
}
