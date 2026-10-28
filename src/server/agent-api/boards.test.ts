import { describe, expect, it, vi } from "vitest"

const { state } = vi.hoisted(() => ({
  state: { app: {} as never as Record<string, unknown> },
}))

const baseApp = {
  id: "app00001",
  ownerId: "user1",
  name: "Plex",
  description: "",
  url: "https://plex.home",
  iconSource: "dashboard",
  iconSlug: "plex",
  customIconUrl: null,
  iconHash: null,
  darkIconSource: "dashboard",
  darkIconSlug: "plex-dark",
  darkCustomIconUrl: null,
  darkIconHash: null,
  status: "unknown",
  statusChecksEnabled: true,
  lastCheckedAt: null,
  lastError: null,
  probeRequestedAt: null,
  createdAt: new Date(0),
  updatedAt: new Date(0),
}
state.app = baseApp

vi.mock("@/lib/prisma", () => ({
  prisma: {
    board: {
      findFirst: async () => ({
        id: "board001",
        name: "Home",
        createdAt: new Date(0),
        categories: [],
        apps: [{ categoryId: null, position: 0, app: state.app }],
      }),
    },
    user: { findUnique: async () => ({ defaultBoardId: null }) },
  },
}))
vi.mock("@/server/apps/shared", () => ({
  sharedAppService: { get: async () => state.app },
}))

import { createAgentApi } from "./app"
import { registerAppRoutes } from "./apps"
import { registerBoardRoutes } from "./boards"

const iconFields = [
  "iconSource",
  "iconSlug",
  "customIconUrl",
  "iconHash",
  "iconUrl",
  "darkIconSource",
  "darkIconSlug",
  "darkCustomIconUrl",
  "darkIconHash",
  "darkIconUrl",
] as const

async function read(app: Record<string, unknown>) {
  state.app = app
  const api = createAgentApi(async () => ({ id: "user1" }))
  registerAppRoutes(api)
  registerBoardRoutes(api)
  const board = await api.request("/api/v1/boards/board001")
  expect(board.status).toBe(200)
  const boardApp = ((await board.json()) as { apps: Record<string, unknown>[] })
    .apps[0]!
  const shared = (await (
    await api.request("/api/v1/apps/app00001")
  ).json()) as Record<string, unknown>
  return { boardApp, shared }
}

describe("board REST apps", () => {
  it("keeps the existing app response keys and adds the dark icon keys", async () => {
    const { boardApp } = await read(baseApp)
    expect(Object.keys(boardApp).sort()).toEqual(
      [
        "id",
        "ownerId",
        "name",
        "description",
        "url",
        ...iconFields,
        "status",
        "statusChecksEnabled",
        "lastCheckedAt",
        "lastError",
        "probeRequestedAt",
        "createdAt",
        "updatedAt",
        "categoryId",
        "position",
      ].sort(),
    )
  })
  it("does not leak columns outside the DTO", async () => {
    const { boardApp } = await read({ ...baseApp, extraColumn: "x" })
    expect(boardApp).not.toHaveProperty("extraColumn")
  })
  it.each([
    ["distinct dashboard icons", baseApp, "/icons/plex", "/icons/plex-dark"],
    [
      "legacy app without a dark icon",
      {
        ...baseApp,
        darkIconSource: null,
        darkIconSlug: null,
        darkIconHash: null,
      },
      "/icons/plex",
      "/icons/plex",
    ],
    [
      "mixed dashboard light and url dark",
      {
        ...baseApp,
        darkIconSource: "url",
        darkIconSlug: null,
        darkCustomIconUrl: "https://i.home/d.png",
        darkIconHash: "darkhash",
      },
      "/icons/plex",
      "/icons/darkhash",
    ],
    [
      "mixed url light and dashboard dark",
      {
        ...baseApp,
        iconSource: "url",
        iconSlug: null,
        customIconUrl: "https://i.home/l.png",
        iconHash: "lighthash",
      },
      "/icons/lighthash",
      "/icons/plex-dark",
    ],
  ])(
    "matches the app DTO for %s",
    async (_name, saved, iconUrl, darkIconUrl) => {
      const { boardApp, shared } = await read(saved)
      expect(boardApp.iconUrl).toBe(iconUrl)
      expect(boardApp.darkIconUrl).toBe(darkIconUrl)
      for (const field of iconFields)
        expect(boardApp[field]).toEqual(shared[field])
    },
  )
})
