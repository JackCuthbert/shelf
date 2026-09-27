import { z } from "@hono/zod-openapi"

export const ErrorSchema = z
  .object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.unknown().optional(),
    }),
  })
  .openapi("ApiError", {
    example: { error: { code: "NOT_FOUND", message: "Resource not found." } },
  })

export function apiError(
  status: 400 | 401 | 403 | 404 | 409 | 500 | 502,
  code: string,
  message: string,
  details?: unknown,
) {
  return Response.json(
    { error: { code, message, ...(details === undefined ? {} : { details }) } },
    { status },
  )
}
