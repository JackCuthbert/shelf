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
vi.mock("@/server/shared-apps", () => ({ sharedAppService: service }))

import { createAgentApi } from "./app"
import { registerAppRoutes } from "./apps"
import { AppForbiddenError, AppUrlConflictError } from "@/server/app-service"

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
  status: "unknown",
  lastCheckedAt: null,
  lastError: null,
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
    expect((await app.request("/api/v1/apps")).status).toBe(200)
    expect((await app.request("/api/v1/apps/app-1")).status).toBe(200)
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
    expect(service.update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "app-1", description: "" }),
      "another-user",
    )
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
