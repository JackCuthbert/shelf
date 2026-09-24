import { describe, expect, it } from "vitest"
import { appRouterRoot } from "./root"

describe("imports router", () => {
  it("rejects anonymous preview calls", async () => {
    const caller = appRouterRoot.createCaller({ session: null })
    await expect(
      caller.imports.previewHomarr({
        baseUrl: "https://homarr.home",
        apiKey: "abc123.token",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("maps an invalid Homarr address to a bad request", async () => {
    const caller = appRouterRoot.createCaller({
      session: { user: { id: "user-1" } },
    } as never)
    await expect(
      caller.imports.previewHomarr({ baseUrl: "nope", apiKey: "abc.token" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("valid HTTP(S)"),
    })
  })
})
