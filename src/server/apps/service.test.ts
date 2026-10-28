import { mkdtemp, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, vi } from "vitest"
import { createIconCache } from "@/lib/icon-cache"
import {
  AppForbiddenError,
  AppUrlConflictError,
  createSharedAppService,
  type AppRepository,
  type SharedApp,
} from "./service"

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
        probeRequestedAt: null,
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
      [...records.values()].filter((app) =>
        [
          app.iconSlug,
          app.iconHash,
          app.darkIconSlug,
          app.darkIconHash,
        ].includes(key),
      ).length,
  }
  const cache = {
    ensure: vi.fn(async () => true),
    storeFromUrl: vi.fn(async () => ({ hash: "hash-a", created: true })),
    remove: vi.fn(async (_key: string) => {}),
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
      rawService.update(
        { ...dashboardInput, id: app.id, statusChecksEnabled: false },
        "user-2",
      ),
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
    expect(records.get(created.id)?.statusChecksEnabled).toBe(true)
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
      probeRequestedAt: checkedAt,
    })
    const updated = await service.update({
      ...dashboardInput,
      id: created.id,
      description: "Movies and shows",
    })
    expect(updated.description).toBe("Movies and shows")
    expect(updated.status).toBe("up")
    expect(updated.lastCheckedAt).toEqual(checkedAt)
    expect(updated.probeRequestedAt).toEqual(checkedAt)
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

  it("defaults status checks to enabled and stores an explicit opt-out", async () => {
    const { service } = setup()
    expect((await service.create(dashboardInput)).statusChecksEnabled).toBe(
      true,
    )
    expect(
      (
        await service.create({
          ...urlInput,
          url: "https://other-media.home",
          statusChecksEnabled: false,
        })
      ).statusChecksEnabled,
    ).toBe(false)
  })

  it("preserves a disabled setting when omitted and clears status only on a real toggle", async () => {
    const { service, records } = setup()
    const created = await service.create({
      ...dashboardInput,
      statusChecksEnabled: false,
    })
    const checkedAt = new Date("2026-09-24T00:00:00Z")
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: checkedAt,
      lastError: "Connection refused",
      probeRequestedAt: checkedAt,
    })

    const renamed = await service.update({
      ...dashboardInput,
      id: created.id,
      name: "Renamed",
    })
    expect(renamed.statusChecksEnabled).toBe(false)
    expect(renamed.status).toBe("up")
    expect(renamed.lastCheckedAt).toEqual(checkedAt)

    const sameValue = await service.update({
      ...dashboardInput,
      id: created.id,
      name: "Renamed",
      statusChecksEnabled: false,
    })
    expect(sameValue.status).toBe("up")
    expect(sameValue.lastCheckedAt).toEqual(checkedAt)

    const toggled = await service.update({
      ...dashboardInput,
      id: created.id,
      name: "Renamed",
      statusChecksEnabled: true,
    })
    expect(toggled.statusChecksEnabled).toBe(true)
    expect(toggled.status).toBe("unknown")
    expect(toggled.lastCheckedAt).toBeNull()
    expect(toggled.lastError).toBeNull()
    expect(toggled.probeRequestedAt).toBeNull()
  })

  it("clears cached status when an app URL changes", async () => {
    const { service, records } = setup()
    const created = await service.create(dashboardInput)
    records.set(created.id, {
      ...created,
      status: "up",
      lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
      lastError: "Connection refused",
      probeRequestedAt: new Date("2026-09-24T01:00:00Z"),
    })

    const updated = await service.update({
      ...dashboardInput,
      id: created.id,
      url: "https://new-media.home",
    })

    expect(updated.status).toBe("unknown")
    expect(updated.lastCheckedAt).toBeNull()
    expect(updated.lastError).toBeNull()
    expect(updated.probeRequestedAt).toBeNull()
  })

  it("keeps a key shared by the light and dark slots of another app after a light edit", async () => {
    const { rawService, records, cache } = setup()
    const first = await rawService.create(dashboardInput, "user-1")
    const other = await rawService.create(
      { ...dashboardInput, url: "https://other.home", iconSlug: "sonarr" },
      "user-1",
    )
    records.set(other.id, { ...other, darkIconSlug: "plex" })
    await rawService.update(
      { ...dashboardInput, id: first.id, iconSlug: "radarr" },
      "user-1",
    )
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("preserves dark fields on a light edit and removes the old light key", async () => {
    const { rawService, records, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    records.set(app.id, { ...app, darkIconSlug: "plex-dark" })
    const updated = await rawService.update(
      { ...dashboardInput, id: app.id, iconSlug: "radarr" },
      "user-1",
    )
    expect(updated.darkIconSlug).toBe("plex-dark")
    expect(cache.remove).toHaveBeenCalledTimes(1)
    expect(cache.remove).toHaveBeenCalledWith("plex")
  })

  it("keeps a key that moved between slots of the same app", async () => {
    const { rawService, records, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    records.set(app.id, { ...app, darkIconSlug: "radarr" })
    await rawService.update(
      { ...dashboardInput, id: app.id, iconSlug: "radarr" },
      "user-1",
    )
    expect(cache.remove).toHaveBeenCalledTimes(1)
    expect(cache.remove).toHaveBeenCalledWith("plex")
  })

  it("removes distinct light and dark keys, and a repeated key once, on delete", async () => {
    const { rawService, records, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    records.set(app.id, { ...app, darkIconSlug: "plex-dark" })
    await rawService.delete(app.id, "user-1")
    expect(cache.remove.mock.calls.map((call) => call[0]).sort()).toEqual([
      "plex",
      "plex-dark",
    ])

    cache.remove.mockClear()
    const same = await rawService.create(dashboardInput, "user-1")
    records.set(same.id, { ...same, darkIconSlug: "plex" })
    await rawService.delete(same.id, "user-1")
    expect(cache.remove).toHaveBeenCalledTimes(1)
    expect(cache.remove).toHaveBeenCalledWith("plex")
  })

  it("keeps keys on delete while another app references them in either slot", async () => {
    const { rawService, records, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    const other = await rawService.create(
      { ...dashboardInput, url: "https://other.home", iconSlug: "sonarr" },
      "user-1",
    )
    records.set(app.id, { ...app, darkIconSlug: "dark-x" })
    records.set(other.id, { ...other, darkIconSlug: "plex" })
    await rawService.delete(app.id, "user-1")
    expect(cache.remove.mock.calls.map((call) => call[0])).toEqual(["dark-x"])
    await rawService.delete(other.id, "user-1")
    expect(cache.remove.mock.calls.map((call) => call[0]).sort()).toEqual([
      "dark-x",
      "plex",
      "sonarr",
    ])
  })

  it("reuses a saved dark URL for the light icon without fetching or erasing the dark reference", async () => {
    const { rawService, records, cache } = setup()
    const app = await rawService.create(urlInput, "user-1")
    records.set(app.id, {
      ...app,
      darkIconSource: "url",
      darkCustomIconUrl: "https://images.home/dark.png",
      darkIconHash: "hash-dark",
    })
    cache.storeFromUrl.mockClear()
    const updated = await rawService.update(
      { ...urlInput, id: app.id, iconUrl: "https://images.home/dark.png" },
      "user-1",
    )
    expect(cache.storeFromUrl).not.toHaveBeenCalled()
    expect(updated.iconHash).toBe("hash-dark")
    expect(updated.darkIconHash).toBe("hash-dark")
    expect(updated.darkCustomIconUrl).toBe("https://images.home/dark.png")
    expect(cache.remove).toHaveBeenCalledTimes(1)
    expect(cache.remove).toHaveBeenCalledWith("hash-a")
  })

  it("removes a newly cached icon when the database update fails", async () => {
    const { rawService, repository, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    vi.spyOn(repository, "update").mockRejectedValueOnce(new Error("db down"))
    await expect(
      rawService.update(
        { ...dashboardInput, id: app.id, iconSlug: "radarr" },
        "user-1",
      ),
    ).rejects.toThrow("db down")
    expect(cache.remove).toHaveBeenCalledTimes(1)
    expect(cache.remove).toHaveBeenCalledWith("radarr")
  })

  it("keeps pre-existing or shared cache keys when a save fails", async () => {
    const { rawService, repository, cache } = setup()
    cache.ensure.mockResolvedValueOnce(false)
    vi.spyOn(repository, "create").mockRejectedValueOnce(new Error("db down"))
    await expect(rawService.create(dashboardInput, "user-1")).rejects.toThrow(
      "db down",
    )
    expect(cache.remove).not.toHaveBeenCalled()

    cache.storeFromUrl.mockResolvedValueOnce({
      hash: "hash-a",
      created: false,
    })
    vi.spyOn(repository, "create").mockRejectedValueOnce(new Error("db down"))
    await expect(rawService.create(urlInput, "user-1")).rejects.toThrow(
      "db down",
    )
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("keeps a newly created cache key that another record references", async () => {
    const { rawService, repository, cache } = setup()
    await rawService.create(dashboardInput, "user-1")
    cache.remove.mockClear()
    vi.spyOn(repository, "create").mockRejectedValueOnce(new Error("db down"))
    await expect(
      rawService.create(
        { ...dashboardInput, url: "https://other.home" },
        "user-1",
      ),
    ).rejects.toThrow("db down")
    expect(cache.remove).not.toHaveBeenCalled()
  })

  it("reports the save error when cleanup also fails", async () => {
    const { rawService, repository, cache } = setup()
    vi.spyOn(repository, "create").mockRejectedValueOnce(new Error("db down"))
    cache.remove.mockRejectedValueOnce(new Error("disk"))
    await expect(rawService.create(dashboardInput, "user-1")).rejects.toThrow(
      "db down",
    )
  })

  it("rejects an owner or URL conflict before preparing an icon", async () => {
    const { rawService, cache } = setup()
    const app = await rawService.create(dashboardInput, "user-1")
    const other = await rawService.create(
      { ...dashboardInput, url: "https://other.home" },
      "user-1",
    )
    cache.ensure.mockClear()
    cache.storeFromUrl.mockClear()
    await expect(
      rawService.update({ ...urlInput, id: app.id }, "user-2"),
    ).rejects.toBeInstanceOf(AppForbiddenError)
    await expect(
      rawService.update({ ...urlInput, id: other.id, url: app.url }, "user-1"),
    ).rejects.toBeInstanceOf(AppUrlConflictError)
    await expect(rawService.create(urlInput, "user-2")).rejects.toBeInstanceOf(
      AppUrlConflictError,
    )
    expect(cache.ensure).not.toHaveBeenCalled()
    expect(cache.storeFromUrl).not.toHaveBeenCalled()
  })

  describe("dark icon", () => {
    const darkUrl = "https://images.home/dark.png"
    const darkUrlIcon = { iconSource: "url" as const, iconUrl: darkUrl }

    it("stores null dark fields when darkIcon is omitted on create", async () => {
      const { service } = setup()
      const app = await service.create(dashboardInput)
      expect(app).toMatchObject({
        darkIconSource: null,
        darkIconSlug: null,
        darkCustomIconUrl: null,
        darkIconHash: null,
      })
    })

    it("stores a mixed dashboard light and URL dark selection", async () => {
      const { service, cache } = setup()
      cache.storeFromUrl.mockResolvedValueOnce({
        hash: "hash-d",
        created: true,
      })
      const app = await service.create({
        ...dashboardInput,
        darkIcon: darkUrlIcon,
      })
      expect(app).toMatchObject({
        iconSource: "dashboard",
        iconSlug: "plex",
        darkIconSource: "url",
        darkIconSlug: null,
        darkCustomIconUrl: darkUrl,
        darkIconHash: "hash-d",
      })
    })

    it("stores a dashboard dark icon and nulls inactive fields", async () => {
      const { service } = setup()
      const app = await service.create({
        ...urlInput,
        darkIcon: { iconSource: "dashboard", iconSlug: "plex-dark" },
      })
      expect(app).toMatchObject({
        darkIconSource: "dashboard",
        darkIconSlug: "plex-dark",
        darkCustomIconUrl: null,
        darkIconHash: null,
      })
    })

    it("prepares identical selections once", async () => {
      const { service, cache } = setup()
      await service.create({
        ...dashboardInput,
        darkIcon: { iconSource: "dashboard", iconSlug: "plex" },
      })
      expect(cache.ensure).toHaveBeenCalledTimes(1)
      await service.create({
        ...urlInput,
        url: "https://two.home",
        darkIcon: { iconSource: "url", iconUrl: urlInput.iconUrl },
      })
      expect(cache.storeFromUrl).toHaveBeenCalledTimes(1)
    })

    it("preserves saved dark fields when update omits darkIcon", async () => {
      const { service, cache } = setup()
      const app = await service.create({
        ...dashboardInput,
        darkIcon: { iconSource: "dashboard", iconSlug: "plex-dark" },
      })
      cache.ensure.mockClear()
      const updated = await service.update({
        ...dashboardInput,
        id: app.id,
        iconSlug: "radarr",
      })
      expect(updated.darkIconSlug).toBe("plex-dark")
      expect(updated.darkIconSource).toBe("dashboard")
      expect(cache.remove).toHaveBeenCalledWith("plex")
      expect(cache.remove).not.toHaveBeenCalledWith("plex-dark")
    })

    it("removes a replaced dark key only after its last reference", async () => {
      const { service, cache } = setup()
      const first = await service.create({
        ...dashboardInput,
        darkIcon: { iconSource: "dashboard", iconSlug: "shared" },
      })
      await service.create({
        ...dashboardInput,
        url: "https://two.home",
        iconSlug: "shared",
      })
      await service.update({
        ...dashboardInput,
        id: first.id,
        darkIcon: { iconSource: "dashboard", iconSlug: "other" },
      })
      expect(cache.remove).not.toHaveBeenCalledWith("shared")
      const second = (await service.list())[1]
      await service.update({
        ...dashboardInput,
        id: second.id,
        url: "https://two.home",
        iconSlug: "plex",
      })
      expect(cache.remove).toHaveBeenCalledWith("shared")
    })

    it("reuses unchanged saved URLs and swaps them between slots without fetching", async () => {
      const { service, cache } = setup()
      cache.storeFromUrl
        .mockResolvedValueOnce({ hash: "hash-l", created: true })
        .mockResolvedValueOnce({ hash: "hash-d", created: true })
      const app = await service.create({ ...urlInput, darkIcon: darkUrlIcon })
      cache.storeFromUrl.mockClear()
      const swapped = await service.update({
        ...urlInput,
        id: app.id,
        iconUrl: darkUrl,
        darkIcon: { iconSource: "url", iconUrl: urlInput.iconUrl },
      })
      expect(cache.storeFromUrl).not.toHaveBeenCalled()
      expect(swapped).toMatchObject({
        iconHash: "hash-d",
        darkIconHash: "hash-l",
      })
      expect(cache.remove).not.toHaveBeenCalled()
    })

    it("does not mutate or leak files when the second image fails", async () => {
      const { service, repository, cache } = setup()
      cache.ensure.mockResolvedValueOnce(true)
      cache.storeFromUrl.mockRejectedValueOnce(new Error("dark offline"))
      await expect(
        service.create({ ...dashboardInput, darkIcon: darkUrlIcon }),
      ).rejects.toThrow("dark offline")
      expect(await repository.list()).toEqual([])
      expect(cache.remove).toHaveBeenCalledWith("plex")

      const app = await service.create(dashboardInput)
      cache.remove.mockClear()
      cache.ensure.mockResolvedValueOnce(true)
      cache.storeFromUrl.mockRejectedValueOnce(new Error("dark offline"))
      await expect(
        service.update({
          ...dashboardInput,
          id: app.id,
          iconSlug: "radarr",
          darkIcon: darkUrlIcon,
        }),
      ).rejects.toThrow("dark offline")
      expect(await repository.find(app.id)).toMatchObject({
        iconSlug: "plex",
        darkIconSource: null,
      })
      expect(cache.remove).toHaveBeenCalledTimes(1)
      expect(cache.remove).toHaveBeenCalledWith("radarr")
    })

    it("removes both new keys when the database write fails", async () => {
      const { service, repository, cache } = setup()
      cache.ensure.mockResolvedValueOnce(true)
      cache.storeFromUrl.mockResolvedValueOnce({
        hash: "hash-d",
        created: true,
      })
      vi.spyOn(repository, "create").mockRejectedValueOnce(new Error("db down"))
      await expect(
        service.create({ ...dashboardInput, darkIcon: darkUrlIcon }),
      ).rejects.toThrow("db down")
      expect(cache.remove).toHaveBeenCalledWith("plex")
      expect(cache.remove).toHaveBeenCalledWith("hash-d")
    })

    describe("with the real icon cache", () => {
      const png = Buffer.concat([
        Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
        Buffer.from("same bytes"),
      ])

      async function realSetup(fetchUrl: (url: string) => Promise<Buffer>) {
        const directory = await mkdtemp(join(tmpdir(), "shelf-icons-"))
        const { repository } = setup()
        const service = createSharedAppService(
          repository,
          createIconCache(directory, async () => png, fetchUrl),
        )
        return { directory, service, repository }
      }

      it("fetches an identical new URL once for both slots", async () => {
        const fetchUrl = vi
          .fn<(url: string) => Promise<Buffer>>()
          .mockResolvedValueOnce(png)
          .mockRejectedValue(new Error("second fetch"))
        const { directory, service } = await realSetup(fetchUrl)
        try {
          const app = await service.create(
            {
              ...urlInput,
              darkIcon: { iconSource: "url", iconUrl: urlInput.iconUrl },
            },
            "user-1",
          )
          expect(fetchUrl).toHaveBeenCalledTimes(1)
          expect(app.iconHash).toBe(app.darkIconHash)
          expect(await readdir(directory)).toEqual([`${app.iconHash}.png`])
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      })

      it("keeps one valid file for different URLs with identical bytes", async () => {
        const { directory, service } = await realSetup(async () => png)
        try {
          const app = await service.create(
            { ...urlInput, darkIcon: darkUrlIcon },
            "user-1",
          )
          expect(app.iconHash).toBe(app.darkIconHash)
          expect(await readdir(directory)).toEqual([`${app.iconHash}.png`])
          const updated = await service.update(
            {
              ...urlInput,
              id: app.id,
              iconUrl: "https://images.home/third.png",
              darkIcon: darkUrlIcon,
            },
            "user-1",
          )
          expect(updated.iconHash).toBe(app.iconHash)
          expect(await readdir(directory)).toEqual([`${app.iconHash}.png`])
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      })

      it("leaves no new file when the second image fails", async () => {
        const fetchUrl = vi
          .fn<(url: string) => Promise<Buffer>>()
          .mockResolvedValueOnce(png)
          .mockRejectedValueOnce(new Error("dark offline"))
        const { directory, service, repository } = await realSetup(fetchUrl)
        try {
          await expect(
            service.create({ ...urlInput, darkIcon: darkUrlIcon }, "user-1"),
          ).rejects.toThrow("dark offline")
          expect(await repository.list()).toEqual([])
          expect(await readdir(directory)).toEqual([])
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      })
    })
  })
})
