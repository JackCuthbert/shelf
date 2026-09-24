import { describe, expect, it, vi } from "vitest"
import {
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
    create: async (input) => {
      const app = {
        ...input,
        id: String(++nextId),
        status: "unknown",
        lastCheckedAt: null,
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
    countIcon: async (slug) =>
      [...records.values()].filter((app) => app.iconSlug === slug).length,
  }
  const cache = {
    ensure: vi.fn(async () => true),
    remove: vi.fn(async () => {}),
  }
  return {
    service: createSharedAppService(repository, cache),
    repository,
    cache,
    records,
  }
}

const input = {
  name: "Media",
  description: "Streaming",
  url: "https://media.home",
  iconSlug: "plex",
}

describe("shared app service", () => {
  it("does not create a record or remove a cached icon after a failed download", async () => {
    const { service, repository, cache } = setup()
    cache.ensure.mockRejectedValueOnce(new Error("offline"))
    await expect(service.create(input)).rejects.toThrow("offline")
    expect(await repository.list()).toEqual([])
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("removes the previous icon only after its last app stops referencing it", async () => {
    const { service, cache } = setup()
    const first = await service.create(input)
    await service.create({ ...input, name: "Plex again" })
    await service.update({ id: first.id, ...input, iconSlug: "jellyfin" })
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
    await expect(service.create(input)).rejects.toThrow("database unavailable")
    expect(await repository.list()).toEqual([])
    expect(cache.remove).toHaveBeenCalledWith("plex")
  })

  it("keeps the existing record unchanged when the replacement icon download fails", async () => {
    const { service, cache, records } = setup()
    const created = await service.create(input)
    cache.ensure.mockRejectedValueOnce(new Error("offline"))
    await expect(
      service.update({
        id: created.id,
        ...input,
        name: "Changed",
        iconSlug: "jellyfin",
      }),
    ).rejects.toThrow("offline")
    expect(records.get(created.id)?.name).toBe("Media")
    expect(records.get(created.id)?.iconSlug).toBe("plex")
  })

  it("preserves cached status when the description changes", async () => {
    const { service, records } = setup()
    const created = await service.create(input)
    const checkedAt = new Date("2026-09-24T00:00:00Z")
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: checkedAt,
    })
    const updated = await service.update({
      ...input,
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
      const created = await service.create(input)
      const checkedAt = new Date("2026-09-24T00:00:00Z")
      records.set(created.id, {
        ...created,
        status: "up",
        lastCheckedAt: checkedAt,
      })

      const updated = await service.update({
        ...input,
        ...fields,
        id: created.id,
      })

      expect(updated.status).toBe("up")
      expect(updated.lastCheckedAt).toEqual(checkedAt)
    },
  )

  it("clears cached status when an app URL changes", async () => {
    const { service, records } = setup()
    const created = await service.create(input)
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
    })

    const updated = await service.update({
      ...input,
      id: created.id,
      url: "https://new-media.home",
    })

    expect(updated.status).toBe("unknown")
    expect(updated.lastCheckedAt).toBeNull()
  })
})
