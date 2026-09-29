import { describe, expect, it, vi } from "vitest"
import { appRouterRoot } from "./root"

const prismaMocks = vi.hoisted(() => ({
  findMany: vi.fn(async () => []),
  findUnique: vi.fn(async () => null),
  updateMany: vi.fn(async () => ({ count: 0 })),
  transaction: vi.fn(async (callback: (tx: unknown) => unknown) =>
    callback({
      app: {
        findUnique: prismaMocks.findUnique,
        updateMany: prismaMocks.updateMany,
      },
    }),
  ),
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    app: prismaMocks,
    board: { findUnique: vi.fn(async () => null) },
    $transaction: prismaMocks.transaction,
  },
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

describe("app status procedures", () => {
  const caller = appRouterRoot.createCaller({ session: null })
  it("accepts an empty public snapshot read", async () => {
    await expect(caller.apps.statuses({ ids: [] })).resolves.toEqual([])
  })

  it.each([
    ["URL", ["https://bad.example"]],
    ["invalid ID", ["not an id"]],
    [
      "more than one hundred IDs",
      Array.from({ length: 101 }, (_, i) => `app${String(i).padStart(5, "0")}`),
    ],
  ])("rejects %s", async (_label, ids) => {
    await expect(caller.apps.statuses({ ids })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    })
  })

  it("omits missing IDs and deduplicates repository reads", async () => {
    prismaMocks.findMany.mockClear()
    await expect(
      caller.apps.statuses({ ids: ["app00001", "app00001"] }),
    ).resolves.toEqual([])
    expect(prismaMocks.findMany).toHaveBeenCalledTimes(1)
  })

  it("accepts protected requests and reports missing IDs", async () => {
    const protectedCaller = appRouterRoot.createCaller({
      session: { user: { id: "u", name: "User" } } as never,
    })
    prismaMocks.findUnique.mockResolvedValueOnce({
      id: "app00001",
      probeRequestedAt: null,
    } as never)
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 1 })
    await expect(
      protectedCaller.apps.recheckStatus({ id: "app00001" }),
    ).resolves.toEqual({ accepted: true })
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 0 })
    prismaMocks.findUnique.mockResolvedValueOnce(null)
    prismaMocks.findUnique.mockReset()
    prismaMocks.updateMany.mockReset()
    prismaMocks.updateMany.mockResolvedValueOnce({ count: 0 })
    prismaMocks.findUnique.mockResolvedValueOnce(null)
    await expect(
      protectedCaller.apps.recheckStatus({ id: "missing1" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" })
  })
})
