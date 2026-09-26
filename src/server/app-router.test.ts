import { describe, expect, it, vi } from "vitest"
import { appRouterRoot } from "./root"

vi.mock("@/lib/prisma", () => ({
  prisma: { app: { findMany: vi.fn(async () => []) } },
}))

describe("app router authentication", () => {
  const caller = appRouterRoot.createCaller({ session: null })

  it("allows anonymous app listing", async () => {
    await expect(caller.apps.list()).resolves.toEqual([])
  })

  it.each([
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
    ["recheckStatus", () => caller.apps.recheckStatus({ id: "1" })],
  ])("rejects anonymous %s calls", async (_name, request) => {
    await expect(request()).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })
})
