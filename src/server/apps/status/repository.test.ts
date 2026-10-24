import { execFileSync } from "node:child_process"
import { cp, mkdtemp, readdir, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
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
      iconHash TEXT, status TEXT NOT NULL DEFAULT 'unknown', statusChecksEnabled BOOLEAN NOT NULL DEFAULT true,
      lastCheckedAt DATETIME, lastError TEXT,
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

describe("optional status checks migration", () => {
  const migration = "20261024120000_optional_status_checks"
  const prismaDirectory = join(process.cwd(), "prisma")
  let directory: string
  let dbPath: string
  let db: PrismaClient

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "shelf-migration-"))
    dbPath = join(directory, "app.db")
    await cp(
      join(prismaDirectory, "schema.prisma"),
      join(directory, "schema.prisma"),
    )
    const migrations = await readdir(join(prismaDirectory, "migrations"), {
      withFileTypes: true,
    })
    for (const entry of migrations) {
      if (entry.isDirectory() && entry.name >= migration) continue
      await cp(
        join(prismaDirectory, "migrations", entry.name),
        join(directory, "migrations", entry.name),
        { recursive: true },
      )
    }
    db = new PrismaClient({
      adapter: new PrismaLibSql({ url: `file:${dbPath}` }),
    })
  })
  afterEach(async () => {
    await db.$disconnect()
    await rm(directory, { recursive: true, force: true })
  })

  function deploy() {
    const require = createRequire(fileURLToPath(import.meta.url))
    const cli = join(
      dirname(require.resolve("prisma/package.json")),
      "build/index.js",
    )
    execFileSync(
      process.execPath,
      [cli, "migrate", "deploy", "--schema", join(directory, "schema.prisma")],
      {
        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
        stdio: "ignore",
      },
    )
  }

  it("keeps an existing enabled app and its data, then defaults new apps to enabled", async () => {
    deploy()
    await db.$executeRawUnsafe(
      `INSERT INTO "user" (id, name, email, updatedAt) VALUES ('user1', 'User', 'user@example.com', '2026-10-01T00:00:00.000Z')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "board" (id, name, ownerId, updatedAt) VALUES ('board001', 'Home', 'user1', '2026-10-01T00:00:00.000Z')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "app" (id, ownerId, name, description, url, iconSource, status, lastCheckedAt, createdAt, updatedAt)
       VALUES ('app00001', 'user1', 'Plex', '', 'https://plex.home', 'dashboard', 'up', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "board_app" (boardId, appId, position) VALUES ('board001', 'app00001', 0)`,
    )

    await cp(
      join(prismaDirectory, "migrations", migration),
      join(directory, "migrations", migration),
      { recursive: true },
    )
    deploy()

    const [existing] = await db.$queryRawUnsafe<
      {
        status: string
        statusChecksEnabled: number
        lastCheckedAt: Date
      }[]
    >(
      `SELECT status, statusChecksEnabled, lastCheckedAt FROM "app" WHERE id = 'app00001'`,
    )
    expect(existing.status).toBe("up")
    expect(Number(existing.statusChecksEnabled)).toBe(1)
    expect(existing.lastCheckedAt).toEqual(new Date("2026-10-01T00:00:00.000Z"))
    expect(
      await db.$queryRawUnsafe(
        `SELECT appId FROM "board_app" WHERE boardId = 'board001'`,
      ),
    ).toEqual([{ appId: "app00001" }])

    await db.$executeRawUnsafe(
      `INSERT INTO "app" (id, ownerId, name, url, createdAt, updatedAt)
       VALUES ('app00002', 'user1', 'Wiki', 'https://wiki.home', '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z')`,
    )
    const [created] = await db.$queryRawUnsafe<
      { statusChecksEnabled: number }[]
    >(`SELECT statusChecksEnabled FROM "app" WHERE id = 'app00002'`)
    expect(Number(created.statusChecksEnabled)).toBe(1)
  })
})
