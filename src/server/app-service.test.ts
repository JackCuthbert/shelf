import { describe, expect, it, vi } from "vitest"
import {
  AppForbiddenError,
  AppUrlConflictError,
  createSharedAppService,
  type AppRepository,
  type SharedApp,
} from "./app-service"

function setup() {
  const records = new Map<string, SharedApp>()
  let nextId = 0
  const repository: AppRepository = {
    list: async () => [...records.values()],
    find: async (id) => records.get(id) ?? null,
    findByUrl: async (url) =>
      [...records.values()].find((app) => app.url === url) ?? null,
    create: async (input) => {
      const app = {
        ...input,
        id: String(++nextId),
        status: "unknown",
        lastCheckedAt: null,
        lastError: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      records.set(app.id, app)
      return app
    },
    update: async (id, input) => {
      const app = { ...records.get(id)!, ...input, updatedAt: new Date() }
      records.set(id, app)
      return app
    },
    delete: async (id) => {
      const app = records.get(id)!
      records.delete(id)
      return app
    },
    countIcon: async (key) =>
      [...records.values()].filter(
        (app) => app.iconSlug === key || app.iconHash === key,
      ).length,
  }
  const cache = {
    ensure: vi.fn(async () => true),
    storeFromUrl: vi.fn(async () => ({ hash: "hash-a", created: true })),
    remove: vi.fn(async () => {}),
  }
  const rawService = createSharedAppService(repository, cache)
  return {
    service: {
      ...rawService,
      create: (input: Parameters<typeof rawService.create>[0]) =>
        rawService.create(input, "user-1"),
      update: (input: Parameters<typeof rawService.update>[0]) =>
        rawService.update(input, "user-1"),
      delete: (id: string) => rawService.delete(id, "user-1"),
    },
    rawService,
    repository,
    cache,
    records,
  }
}

const dashboardInput = {
  name: "Media",
  description: "Streaming",
  url: "https://media.home",
  iconSource: "dashboard" as const,
  iconSlug: "plex",
}

const urlInput = {
  name: "Media",
  description: "Streaming",
  url: "https://media.home",
  iconSource: "url" as const,
  iconUrl: "https://images.home/plex.png",
}

describe("shared app service", () => {
  it("lets only the creator update or delete an app", async () => {
    const { rawService } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    await expect(
      rawService.update({ ...dashboardInput, id: app.id }, "user-2"),
    ).rejects.toBeInstanceOf(AppForbiddenError)
    await expect(rawService.delete(app.id, "user-2")).rejects.toBeInstanceOf(
      AppForbiddenError,
    )
    expect(await rawService.list()).toHaveLength(1)
    await rawService.delete(app.id, "user-1")
  })

  it("rejects a URL already used by another app", async () => {
    const { rawService } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    await expect(
      rawService.create({ ...dashboardInput, name: "Another" }, "user-2"),
    ).rejects.toBeInstanceOf(AppUrlConflictError)
    const second = await rawService.create(
      { ...dashboardInput, url: "https://other.home" },
      "user-2",
    )
    await expect(
      rawService.update({ ...dashboardInput, id: second.id }, "user-2"),
    ).rejects.toBeInstanceOf(AppUrlConflictError)
    expect(await rawService.list()).toHaveLength(2)
    expect(app.ownerId).toBe("user-1")
  })

  it("does not create a record or remove a cached icon after a failed dashboard download", async () => {
    const { service, repository, cache } = setup()
    cache.ensure.mockRejectedValueOnce(new Error("offline"))
    await expect(service.create(dashboardInput)).rejects.toThrow("offline")
    expect(await repository.list()).toEqual([])
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("removes the previous icon only after its last app stops referencing it", async () => {
    const { service, cache } = setup()
    const first = await service.create(dashboardInput)
    await service.create({
      ...dashboardInput,
      name: "Plex again",
      url: "https://plex-again.home",
    })
    await service.update({
      id: first.id,
      ...dashboardInput,
      iconSlug: "jellyfin",
    })
    expect(cache.remove).not.toHaveBeenCalled()
    await service.delete(first.id)
    expect(cache.remove).toHaveBeenCalledWith("jellyfin")
    const remaining = (await service.list()).find(
      (app) => app.name === "Plex again",
    )!
    await service.delete(remaining.id)
    expect(cache.remove).toHaveBeenLastCalledWith("plex")
  })

  it("removes a newly downloaded icon when the database create fails", async () => {
    const { service, repository, cache } = setup()
    vi.spyOn(repository, "create").mockRejectedValueOnce(
      new Error("database unavailable"),
    )
    await expect(service.create(dashboardInput)).rejects.toThrow(
      "database unavailable",
    )
    expect(await repository.list()).toEqual([])
    expect(cache.remove).toHaveBeenCalledWith("plex")
  })

  it("keeps the existing record unchanged when the replacement icon download fails", async () => {
    const { service, cache, records } = setup()
    const created = await service.create(dashboardInput)
    cache.ensure.mockRejectedValueOnce(new Error("offline"))
    await expect(
      service.update({
        id: created.id,
        ...dashboardInput,
        name: "Changed",
        iconSlug: "jellyfin",
      }),
    ).rejects.toThrow("offline")
    expect(records.get(created.id)?.name).toBe("Media")
    expect(records.get(created.id)?.iconSlug).toBe("plex")
  })

  it("stores a custom image, its hash, and its source URL", async () => {
    const { service, cache, records } = setup()
    const created = await service.create(urlInput)
    expect(cache.storeFromUrl).toHaveBeenCalledWith(urlInput.iconUrl)
    expect(created).toMatchObject({
      iconSource: "url",
      iconSlug: null,
      customIconUrl: urlInput.iconUrl,
      iconHash: "hash-a",
    })
    expect(records.get(created.id)?.iconHash).toBe("hash-a")
  })

  it("removes a newly downloaded custom image when the database create fails", async () => {
    const { service, repository, cache } = setup()
    vi.spyOn(repository, "create").mockRejectedValueOnce(
      new Error("database unavailable"),
    )
    await expect(service.create(urlInput)).rejects.toThrow(
      "database unavailable",
    )
    expect(cache.remove).toHaveBeenCalledWith("hash-a")
  })

  it("does not re-download an unchanged custom image URL", async () => {
    const { service, cache } = setup()
    const created = await service.create(urlInput)
    cache.storeFromUrl.mockClear()
    const updated = await service.update({
      id: created.id,
      ...urlInput,
      name: "Renamed",
    })
    expect(cache.storeFromUrl).not.toHaveBeenCalled()
    expect(updated.iconHash).toBe("hash-a")
    expect(updated.name).toBe("Renamed")
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("downloads a new hash and removes the old one when the custom URL changes", async () => {
    const { service, cache } = setup()
    const created = await service.create(urlInput)
    cache.storeFromUrl.mockResolvedValueOnce({ hash: "hash-b", created: true })
    await service.update({
      id: created.id,
      ...urlInput,
      iconUrl: "https://images.home/other.png",
    })
    expect(cache.storeFromUrl).toHaveBeenCalledWith(
      "https://images.home/other.png",
    )
    expect(cache.remove).toHaveBeenCalledWith("hash-a")
  })

  it("cleans up the old source when switching between icon sources", async () => {
    const { service, cache } = setup()
    const created = await service.create(urlInput)
    await service.update({
      id: created.id,
      ...dashboardInput,
      iconSlug: "jellyfin",
    })
    expect(cache.remove).toHaveBeenCalledWith("hash-a")

    cache.remove.mockClear()
    const dashboardApp = (await service.list())[0]
    await service.update({
      id: dashboardApp.id,
      ...urlInput,
      iconUrl: "https://images.home/new.png",
    })
    expect(cache.remove).toHaveBeenCalledWith("jellyfin")
  })

  it("removes a custom image when its last app is deleted", async () => {
    const { service, cache } = setup()
    const created = await service.create(urlInput)
    await service.delete(created.id)
    expect(cache.remove).toHaveBeenCalledWith("hash-a")
  })

  it("preserves cached status when the description changes", async () => {
    const { service, records } = setup()
    const created = await service.create(dashboardInput)
    const checkedAt = new Date("2026-09-24T00:00:00Z")
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: checkedAt,
    })
    const updated = await service.update({
      ...dashboardInput,
      id: created.id,
      description: "Movies and shows",
    })
    expect(updated.description).toBe("Movies and shows")
    expect(updated.status).toBe("up")
    expect(updated.lastCheckedAt).toEqual(checkedAt)
  })

  it.each([
    ["name", { name: "Media updated" }],
    ["icon", { iconSlug: "jellyfin" }],
  ])(
    "preserves cached status when only the app %s changes",
    async (_, fields) => {
      const { service, records } = setup()
      const created = await service.create(dashboardInput)
      const checkedAt = new Date("2026-09-24T00:00:00Z")
      records.set(created.id, {
        ...created,
        status: "up",
        lastCheckedAt: checkedAt,
      })

      const updated = await service.update({
        ...dashboardInput,
        ...fields,
        id: created.id,
      })

      expect(updated.status).toBe("up")
      expect(updated.lastCheckedAt).toEqual(checkedAt)
    },
  )

  it("clears cached status when an app URL changes", async () => {
    const { service, records } = setup()
    const created = await service.create(dashboardInput)
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
      lastError: "Connection refused",
    })

    const updated = await service.update({
      ...dashboardInput,
      id: created.id,
      url: "https://new-media.home",
    })

    expect(updated.status).toBe("unknown")
    expect(updated.lastCheckedAt).toBeNull()
    expect(updated.lastError).toBeNull()
  })
})
