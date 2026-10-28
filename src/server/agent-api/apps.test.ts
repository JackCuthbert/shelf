import { beforeEach, describe, expect, it, vi } from "vitest"

const { service } = vi.hoisted(() => ({
  service: {
    list: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}))
vi.mock("@/server/apps/shared", () => ({ sharedAppService: service }))

import { createAgentApi } from "./app"
import { registerAppRoutes } from "./apps"
import { AppForbiddenError, AppUrlConflictError } from "@/server/apps/service"

const savedApp = {
  id: "app-1",
  ownerId: "another-user",
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
  createdAt: new Date("2026-09-26T00:00:00Z"),
  updatedAt: new Date("2026-09-26T00:00:00Z"),
}
function setup(userId = "user-1") {
  const app = createAgentApi(async () => ({ id: userId }))
  registerAppRoutes(app)
  return app
}

describe("shared app API", () => {
  beforeEach(() => vi.clearAllMocks())
  it("lets any authenticated user read the shared app list and an app", async () => {
    service.list.mockResolvedValue([savedApp])
    service.get.mockResolvedValue(savedApp)
    const app = setup("another-user")
    const list = await app.request("/api/v1/apps")
    expect(list.status).toBe(200)
    const [dto] = await list.json()
    expect(Object.keys(dto).sort()).toEqual(
      [
        "createdAt",
        "customIconUrl",
        "description",
        "iconHash",
        "iconSlug",
        "iconSource",
        "iconUrl",
        "darkIconSource",
        "darkIconSlug",
        "darkCustomIconUrl",
        "darkIconHash",
        "darkIconUrl",
        "id",
        "lastCheckedAt",
        "lastError",
        "name",
        "ownerId",
        "status",
        "statusChecksEnabled",
        "updatedAt",
        "url",
      ].sort(),
    )
    expect(dto).toMatchObject({
      iconUrl: "/icons/plex",
      darkIconSource: "dashboard",
      darkIconSlug: "plex-dark",
      darkIconUrl: "/icons/plex-dark",
    })
    expect((await app.request("/api/v1/apps/app-1")).status).toBe(200)
  })
  it("falls back to the light icon for a legacy app and resolves a url dark icon", async () => {
    const legacy = {
      ...savedApp,
      darkIconSource: null,
      darkIconSlug: null,
      darkIconHash: null,
    }
    const mixed = {
      ...savedApp,
      darkIconSource: "url",
      darkIconSlug: null,
      darkCustomIconUrl: "https://i.home/d.png",
      darkIconHash: "darkhash",
    }
    service.list.mockResolvedValue([legacy, mixed])
    const list = await (await setup().request("/api/v1/apps")).json()
    expect(list[0]).toMatchObject({
      darkIconSource: null,
      darkIconUrl: "/icons/plex",
    })
    expect(list[1]).toMatchObject({
      iconUrl: "/icons/plex",
      darkIconSource: "url",
      darkCustomIconUrl: "https://i.home/d.png",
      darkIconHash: "darkhash",
      darkIconUrl: "/icons/darkhash",
    })
  })
  it("creates and replaces apps as the key owner", async () => {
    service.create.mockResolvedValue(savedApp)
    service.update.mockResolvedValue(savedApp)
    const app = setup("another-user")
    const body = {
      name: "Plex",
      description: "",
      url: "https://plex.home",
      iconSource: "dashboard",
      iconSlug: "plex",
    }
    const created = await app.request("/api/v1/apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    expect(created.status).toBe(201)
    expect(await created.json()).toMatchObject({
      darkIconSource: "dashboard",
      darkIconSlug: "plex-dark",
      darkIconUrl: "/icons/plex-dark",
    })
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ description: "" }),
      "another-user",
    )
    const updated = await app.request("/api/v1/apps/app-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    })
    expect(updated.status).toBe(200)
    expect(await updated.json()).toMatchObject({
      darkIconSource: "dashboard",
      darkIconSlug: "plex-dark",
      darkIconUrl: "/icons/plex-dark",
    })
    expect(service.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "app-1", description: "" }),
      "another-user",
    )
    expect(service.create.mock.calls[0]?.[0]).not.toHaveProperty(
      "statusChecksEnabled",
    )
    expect(service.update.mock.calls[0]?.[0]).not.toHaveProperty(
      "statusChecksEnabled",
    )
  })
  it("passes an optional darkIcon to the service and rejects an invalid one", async () => {
    service.create.mockResolvedValue(savedApp)
    const app = setup("another-user")
    const request = (darkIcon: unknown) =>
      app.request("/api/v1/apps", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Plex",
          description: "",
          url: "https://plex.home",
          iconSource: "dashboard",
          iconSlug: "plex",
          darkIcon,
        }),
      })
    const darkIcon = { iconSource: "url", iconUrl: "https://i.home/d.png" }
    expect((await request(darkIcon)).status).toBe(201)
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ darkIcon }),
      "another-user",
    )
    service.create.mockClear()
    expect((await request(null)).status).toBe(400)
    expect(service.create).not.toHaveBeenCalled()
  })
  it("sets status checks explicitly and exposes a disabled app", async () => {
    service.create.mockResolvedValue({
      ...savedApp,
      statusChecksEnabled: false,
    })
    service.get.mockResolvedValue({ ...savedApp, statusChecksEnabled: false })
    const app = setup("another-user")
    const created = await app.request("/api/v1/apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Plex",
        description: "",
        url: "https://plex.home",
        iconSource: "dashboard",
        iconSlug: "plex",
        statusChecksEnabled: false,
      }),
    })
    expect(created.status).toBe(201)
    expect(service.create).toHaveBeenCalledWith(
      expect.objectContaining({ statusChecksEnabled: false }),
      "another-user",
    )
    expect((await created.json()).statusChecksEnabled).toBe(false)
    expect(
      (await (await app.request("/api/v1/apps/app-1")).json())
        .statusChecksEnabled,
    ).toBe(false)
  })
  it("rejects an app replacement without a description", async () => {
    const response = await setup().request("/api/v1/apps/app-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Plex",
        url: "https://plex.home",
        iconSource: "dashboard",
        iconSlug: "plex",
      }),
    })
    expect(response.status).toBe(400)
  })
  it("deletes an app as the key owner", async () => {
    service.delete.mockResolvedValue(savedApp)
    const response = await setup("another-user").request("/api/v1/apps/app-1", {
      method: "DELETE",
    })
    expect(response.status).toBe(204)
    expect(service.delete).toHaveBeenCalledWith("app-1", "another-user")
  })
  it("rejects edits to another user's app", async () => {
    service.update.mockRejectedValueOnce(new AppForbiddenError())
    const response = await setup().request("/api/v1/apps/app-1", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Plex",
        description: "",
        url: "https://plex.home",
        iconSource: "dashboard",
        iconSlug: "plex",
      }),
    })
    expect(response.status).toBe(403)
    expect((await response.json()).error.code).toBe("FORBIDDEN")
  })
  it("reports a duplicate app URL as a conflict", async () => {
    service.create.mockRejectedValueOnce(new AppUrlConflictError())
    const response = await setup().request("/api/v1/apps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Plex",
        description: "",
        url: "https://plex.home",
        iconSource: "dashboard",
        iconSlug: "plex",
      }),
    })
    expect(response.status).toBe(409)
    expect((await response.json()).error.code).toBe("CONFLICT")
  })
})
