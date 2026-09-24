import { describe, expect, it } from "vitest"
import { appRouterRoot } from "./root"

describe("app router authentication", () => {
  const caller = appRouterRoot.createCaller({ session: null })

  it.each([
    ["list", () => caller.apps.list()],
    [
      "create",
      () =>
        caller.apps.create({
          name: "Media",
          description: "Media server",
          url: "https://media.home",
          iconSource: "dashboard",
          iconSlug: "plex",
        }),
    ],
    [
      "update",
      () =>
        caller.apps.update({
          id: "1",
          name: "Media",
          description: "Media server",
          url: "https://media.home",
          iconSource: "dashboard",
          iconSlug: "plex",
        }),
    ],
    ["delete", () => caller.apps.delete({ id: "1" })],
  ])("rejects anonymous %s calls", async (_name, request) => {
    await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
