import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@/generated/prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { createAppStatusRepository } from "./repository"

describe("app status repository", () => {
  let directory: string
  let db: PrismaClient
  let repo: ReturnType<typeof createAppStatusRepository>
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "shelf-status-"))
    db = new PrismaClient({
      adapter: new PrismaLibSql({ url: `file:${join(directory, "app.db")}` }),
    })
    await db.$executeRawUnsafe(`CREATE TABLE app (
      id TEXT PRIMARY KEY, ownerId TEXT NOT NULL, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL, iconSource TEXT NOT NULL DEFAULT 'dashboard', iconSlug TEXT, customIconUrl TEXT,
      iconHash TEXT, status TEXT NOT NULL DEFAULT 'unknown', lastCheckedAt DATETIME, lastError TEXT,
      probeRequestedAt DATETIME, createdAt DATETIME NOT NULL, updatedAt DATETIME NOT NULL
    )`)
    await db.$executeRawUnsafe(
      "CREATE TABLE board_app (boardId TEXT NOT NULL, appId TEXT NOT NULL, categoryId TEXT, position INTEGER NOT NULL, PRIMARY KEY (boardId, appId))",
    )
    repo = createAppStatusRepository(db)
  })
  afterEach(async () => {
    await db.$disconnect()
    await rm(directory, { recursive: true, force: true })
  })
  async function insert(id = "app00001", url = "http://nas.home") {
    await db.app.create({ data: { id, ownerId: "user1", name: id, url } })
  }

  it("coalesces manual requests, preserves them during work, and publishes conditionally", async () => {
    await insert()
    await db.app.update({
      where: { id: "app00001" },
      data: { status: "up", lastCheckedAt: new Date(0) },
    })
    const accepted = await Promise.all(
      Array.from({ length: 8 }, () =>
        repo.requestManual("app00001", new Date(1)),
      ),
    )
    expect(accepted.every(Boolean)).toBe(true)
    const selected = await repo.selectNext(new Date(2))
    expect(selected).toEqual({ id: "app00001", trigger: "manual" })
    const work = await repo.markPending(
      selected!.id,
      selected!.trigger,
      new Date(2),
    )
    expect(await repo.requestManual("app00001", new Date(3))).toBe(true)
    expect(
      await repo.publish(work!, { status: "up", lastError: null }, new Date(4)),
    ).toBe(true)
    expect(
      await db.app.findUnique({ where: { id: "app00001" } }),
    ).toMatchObject({ status: "up", probeRequestedAt: null })
  })

  it("selects initial and automatic work and rejects results after URL edits or deletion", async () => {
    await insert()
    expect(await repo.selectNext(new Date(0))).toEqual({
      id: "app00001",
      trigger: "initial",
    })
    const work = await repo.markPending("app00001", "initial", new Date(1))
    await db.app.update({
      where: { id: "app00001" },
      data: {
        url: "http://new.home",
        status: "unknown",
        lastCheckedAt: null,
        lastError: null,
        probeRequestedAt: null,
      },
    })
    expect(
      await repo.publish(work!, { status: "up", lastError: null }, new Date(2)),
    ).toBe(false)
    await db.app.update({
      where: { id: "app00001" },
      data: { lastCheckedAt: new Date(0) },
    })
    expect(await repo.selectNext(new Date(3_599_999))).toBeNull()
    expect(await repo.selectNext(new Date(3_600_000))).toEqual({
      id: "app00001",
      trigger: "automatic",
    })
    const hourly = await repo.markPending(
      "app00001",
      "automatic",
      new Date(3_600_000),
    )
    await db.app.delete({ where: { id: "app00001" } })
    expect(
      await repo.publish(
        hourly!,
        { status: "down", lastError: "offline" },
        new Date(3_600_001),
      ),
    ).toBe(false)
  })

  it("derives automatic eligibility from saved results and the current interval", async () => {
    await insert()
    await db.app.update({
      where: { id: "app00001" },
      data: { lastCheckedAt: new Date(0) },
    })

    expect(await repo.selectNext(new Date(59_999))).toBeNull()
    repo = createAppStatusRepository(db, 60)
    expect(await repo.selectNext(new Date(59_999))).toBeNull()
    expect(await repo.selectNext(new Date(60_000))).toEqual({
      id: "app00001",
      trigger: "automatic",
    })
    repo = createAppStatusRepository(db, 3600)
    expect(await repo.selectNext(new Date(60_000))).toBeNull()
    expect(await repo.selectNext(new Date(3_600_000))).toEqual({
      id: "app00001",
      trigger: "automatic",
    })
  })
})
