import { describe, expect, it } from "vitest"
import { createAgentApi } from "./app"

describe("agent API shell", () => {
  it("serves the OpenAPI document without authentication", async () => {
    const app = createAgentApi(async () => null)
    const response = await app.request("/api/v1/openapi.json")
    expect(response.status).toBe(200)
    expect((await response.json()).openapi).toBe("3.1.0")
  })

  it("does not accept browser cookies in place of a bearer key", async () => {
    const app = createAgentApi(async (headers) =>
      headers.get("authorization") === "Bearer good" ? { id: "user-1" } : null,
    )
    app.get("/api/v1/probe", (c) => c.json({ user: c.get("apiUser").id }))
    const response = await app.request("/api/v1/probe", {
      headers: { cookie: "better-auth.session_token=valid" },
    })
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({
      error: {
        code: "UNAUTHORIZED",
        message: "A valid bearer API key is required.",
      },
    })
  })

  it("passes verified bearer identity to protected routes", async () => {
    const app = createAgentApi(async (headers) =>
      headers.get("authorization") === "Bearer good" ? { id: "user-1" } : null,
    )
    app.get("/api/v1/probe", (c) => c.json({ user: c.get("apiUser").id }))
    const response = await app.request("/api/v1/probe", {
      headers: { authorization: "Bearer good" },
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ user: "user-1" })
  })
})
