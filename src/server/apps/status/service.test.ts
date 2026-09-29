import { describe, expect, it, vi } from "vitest"
import { createAppStatusService, type AppStatusRepository } from "./service"
import type { StatusRecord } from "@/lib/app-status"

const record: StatusRecord = {
  id: "plex0001",
  url: "https://plex.home",
  status: "up",
  lastCheckedAt: new Date("2026-09-29T00:00:00Z"),
  lastError: null,
  probeRequestedAt: null,
}

function setup() {
  const repository: AppStatusRepository = {
    listBoardApps: vi.fn(async () => [record]),
    listApps: vi.fn(async () => [record]),
    requestManual: vi.fn(async () => true),
    selectNext: vi.fn(async () => null),
    markPending: vi.fn(async () => null),
    publish: vi.fn(async () => false),
  }
  return {
    service: createAppStatusService(
      repository,
      () => new Date("2026-09-29T00:30:00Z"),
    ),
    repository,
  }
}

describe("app status service", () => {
  it("returns saved snapshots for concurrent readers without scheduling writes", async () => {
    const { service, repository } = setup()
    const results = await Promise.all([
      service.boardStatuses("abcdefgh"),
      service.boardStatuses("abcdefgh"),
    ])
    expect(results[0]).toMatchObject([
      { id: "plex0001", status: "up", checking: false },
    ])
    expect(results[1]).toEqual(results[0])
    expect(repository.requestManual).not.toHaveBeenCalled()
    expect(repository.markPending).not.toHaveBeenCalled()
  })

  it("preserves board snapshot array shape and reports a missing board", async () => {
    const { service, repository } = setup()
    vi.mocked(repository.listBoardApps).mockResolvedValueOnce([])
    await expect(service.boardStatuses("abcdefgh")).resolves.toEqual([])
    vi.mocked(repository.listBoardApps).mockResolvedValueOnce(null)
    await expect(service.boardStatuses("missing")).resolves.toBeNull()
  })

  it("accepts a manual request without waiting for completion", async () => {
    const { service, repository } = setup()
    await expect(service.requestCheck("plex0001")).resolves.toEqual({
      accepted: true,
    })
    expect(repository.requestManual).toHaveBeenCalledOnce()
  })

  it("returns null when the app no longer exists", async () => {
    const { service, repository } = setup()
    vi.mocked(repository.requestManual).mockResolvedValueOnce(false)
    await expect(service.requestCheck("missing")).resolves.toBeNull()
  })

  it("deduplicates requested IDs and serializes saved times as epoch milliseconds", async () => {
    const { service, repository } = setup()
    await expect(
      service.appStatuses(["plex0001", "plex0001"]),
    ).resolves.toMatchObject([
      { id: "plex0001", lastCheckedAt: Date.parse("2026-09-29T00:00:00Z") },
    ])
    expect(repository.listApps).toHaveBeenCalledWith(["plex0001"])
  })
})
