import { afterEach, describe, expect, it, vi } from "vitest"
import { createAgentApi } from "./app"
import { registerIconRoutes } from "./icons"

describe("icon search route", () => {
  afterEach(() => vi.unstubAllGlobals())
  it("matches aliases and returns deterministic remote previews", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              zeta: { base: "svg", aliases: ["Home Server"] },
              alpha: { base: "png", aliases: ["homeserver"] },
            }),
            { status: 200, headers: { "content-type": "application/json" } },
          ),
      ),
    )
    const app = createAgentApi(async () => ({ id: "user-1" }))
    registerIconRoutes(app)
    const response = await app.request("/api/v1/icons/search?q=home")
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual([
      {
        slug: "alpha",
        aliases: ["homeserver"],
        previewUrl:
          "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/alpha.png",
      },
      {
        slug: "zeta",
        aliases: ["Home Server"],
        previewUrl:
          "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/zeta.svg",
      },
    ])
  })

  it("requires a query and limits results to 60", async () => {
    const app = createAgentApi(async () => ({ id: "user-1" }))
    registerIconRoutes(app)
    expect((await app.request("/api/v1/icons/search")).status).toBe(400)
    expect(
      (await app.request("/api/v1/icons/search?q=plex&limit=61")).status,
    ).toBe(400)
  })
})
