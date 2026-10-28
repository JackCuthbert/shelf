import { describe, expect, it, vi } from "vitest"

const app = {
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

vi.mock("@/lib/prisma", () => ({
  prisma: {
    board: {
      findFirst: async () => ({
        id: "board001",
        name: "Home",
        createdAt: new Date(0),
        categories: [],
        apps: [{ categoryId: null, position: 0, app }],
      }),
    },
    user: { findUnique: async () => ({ defaultBoardId: null }) },
  },
}))

import { createAgentApi } from "./app"
import { registerBoardRoutes } from "./boards"

describe("board REST apps", () => {
  it("keeps the existing app response keys and omits dark references", async () => {
    const api = createAgentApi(async () => ({ id: "user1" }))
    registerBoardRoutes(api)
    const response = await api.request("/api/v1/boards/board001")
    expect(response.status).toBe(200)
    const body = (await response.json()) as { apps?: object[] }
    expect(Object.keys(body.apps?.[0] ?? {}).sort()).toEqual(
      [
        "id",
        "ownerId",
        "name",
        "description",
        "url",
        "iconSource",
        "iconSlug",
        "customIconUrl",
        "iconHash",
        "iconUrl",
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
})
