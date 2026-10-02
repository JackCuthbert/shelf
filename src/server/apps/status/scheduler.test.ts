import { describe, expect, it, vi } from "vitest"
import { createAppStatusScheduler } from "./scheduler"
import type { AppStatusRepository } from "./repository"
import type { ProbeWork, StatusRecord } from "@/lib/app-status"

const record: StatusRecord = {
  id: "app00001",
  url: "http://nas",
  status: "unknown",
  lastCheckedAt: null,
  lastError: null,
  probeRequestedAt: null,
}

describe("app status scheduler", () => {
  it("runs one pending check at a time and publishes its saved result", async () => {
    const events: string[] = []
    const repository: AppStatusRepository = {
      listBoardApps: vi.fn(async () => []),
      listApps: vi.fn(async () => []),
      requestManual: vi.fn(async () => true),
      selectNext: vi.fn(async () => ({
        id: record.id,
        trigger: "initial" as const,
      })),
      markPending: vi.fn(async (_id, trigger, now) => ({
        ...({
          id: record.id,
          url: record.url,
          requestedAt: now,
          trigger,
        } satisfies ProbeWork),
      })),
      publish: vi.fn(async () => {
        events.push("published")
        return true
      }),
    }
    let calls = 0
    let finish!: () => void
    const blocked = new Promise<void>((resolve) => {
      finish = resolve
    })
    const run = createAppStatusScheduler({
      repository,
      probe: async () => {
        calls++
        events.push("probe")
        await blocked
        return { status: "up", lastError: null }
      },
    })
    const running = run()
    await vi.waitFor(() => expect(calls).toBe(1))
    expect(repository.selectNext).toHaveBeenCalledOnce()
    finish()
    const stop = new Error("stop after second selection")
    vi.mocked(repository.selectNext).mockImplementation(async () => {
      throw stop
    })
    await expect(running).rejects.toBe(stop)
    expect(calls).toBe(1)
    expect(repository.markPending).toHaveBeenCalledOnce()
    expect(repository.publish).toHaveBeenCalledOnce()
  })

  it("paces automatic starts while allowing manual work priority", async () => {
    const selected = [
      { id: "hourly01", trigger: "automatic" as const },
      { id: "hourly01", trigger: "automatic" as const },
      { id: "hourly01", trigger: "automatic" as const },
      { id: "hourly01", trigger: "automatic" as const },
      { id: "hourly01", trigger: "automatic" as const },
      { id: "manual01", trigger: "manual" as const },
      { id: "initial01", trigger: "initial" as const },
      { id: "hourly02", trigger: "automatic" as const },
      { id: "hourly02", trigger: "automatic" as const },
    ]
    const repository: AppStatusRepository = {
      listBoardApps: vi.fn(async () => []),
      listApps: vi.fn(async () => []),
      requestManual: vi.fn(async () => true),
      selectNext: vi.fn(async () => {
        const next = selected.shift()
        if (next) return next
        throw new Error("done")
      }),
      markPending: vi.fn(async (id, trigger, requestedAt) => ({
        id,
        url: "http://app",
        trigger,
        requestedAt,
      })),
      publish: vi.fn(async () => true),
    }
    const started: { id: string; at: number }[] = []
    const slept: number[] = []
    let current = 0
    const run = createAppStatusScheduler({
      repository,
      now: () => new Date(current),
      sleep: async (ms) => {
        slept.push(ms)
        current += ms
      },
      probe: async (work) => {
        started.push({ id: work.id, at: current })
        return { status: "up", lastError: null }
      },
    })
    await expect(run()).rejects.toThrow("done")
    expect(started).toEqual([
      { id: "hourly01", at: 0 },
      { id: "manual01", at: 4000 },
      { id: "initial01", at: 4000 },
      { id: "hourly02", at: 5000 },
    ])
    expect(slept).toEqual([1000, 1000, 1000, 1000, 1000])
  })
})
