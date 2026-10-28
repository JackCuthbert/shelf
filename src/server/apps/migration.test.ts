import { execFileSync } from "node:child_process"
import { cp, mkdtemp, readdir, rm } from "node:fs/promises"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "@/generated/prisma/client"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

describe("dark app icons migration", () => {
  const migration = "20261028120000_dark_app_icons"
  const prismaDirectory = join(process.cwd(), "prisma")
  const stamp = "2026-10-01T00:00:00.000Z"
  let directory: string
  let dbPath: string
  let db: PrismaClient

  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "shelf-dark-icons-"))
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

  it("keeps existing apps, status and assignments and adds null dark references", async () => {
    deploy()
    await db.$executeRawUnsafe(
      `INSERT INTO "user" (id, name, email, updatedAt) VALUES ('user1', 'User', 'user@example.com', '${stamp}')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "board" (id, name, ownerId, updatedAt) VALUES ('board001', 'Home', 'user1', '${stamp}')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "app" (id, ownerId, name, description, url, iconSource, iconSlug, status, lastCheckedAt, createdAt, updatedAt)
       VALUES ('app00001', 'user1', 'Plex', '', 'https://plex.home', 'dashboard', 'plex', 'up', '${stamp}', '${stamp}', '${stamp}')`,
    )
    await db.$executeRawUnsafe(
      `INSERT INTO "app" (id, ownerId, name, description, url, iconSource, customIconUrl, iconHash, status, createdAt, updatedAt)
       VALUES ('app00002', 'user1', 'Wiki', '', 'https://wiki.home', 'url', 'https://wiki.home/icon.png', 'hash-wiki', 'down', '${stamp}', '${stamp}')`,
    )
    for (const [position, appId] of ["app00001", "app00002"].entries()) {
      await db.$executeRawUnsafe(
        `INSERT INTO "board_app" (boardId, appId, position) VALUES ('board001', '${appId}', ${position})`,
      )
    }

    await cp(
      join(prismaDirectory, "migrations", migration),
      join(directory, "migrations", migration),
      { recursive: true },
    )
    deploy()

    async function expectUpgraded() {
      expect(
        await db.app.findMany({
          orderBy: { id: "asc" },
          omit: { createdAt: true, updatedAt: true, probeRequestedAt: true },
        }),
      ).toEqual([
        {
          id: "app00001",
          ownerId: "user1",
          name: "Plex",
          description: "",
          url: "https://plex.home",
          iconSource: "dashboard",
          iconSlug: "plex",
          customIconUrl: null,
          iconHash: null,
          darkIconSource: null,
          darkIconSlug: null,
          darkCustomIconUrl: null,
          darkIconHash: null,
          status: "up",
          statusChecksEnabled: true,
          lastCheckedAt: new Date(stamp),
          lastError: null,
        },
        {
          id: "app00002",
          ownerId: "user1",
          name: "Wiki",
          description: "",
          url: "https://wiki.home",
          iconSource: "url",
          iconSlug: null,
          customIconUrl: "https://wiki.home/icon.png",
          iconHash: "hash-wiki",
          darkIconSource: null,
          darkIconSlug: null,
          darkCustomIconUrl: null,
          darkIconHash: null,
          status: "down",
          statusChecksEnabled: true,
          lastCheckedAt: null,
          lastError: null,
        },
      ])
      expect(
        await db.boardApp.findMany({
          orderBy: { position: "asc" },
          select: { boardId: true, appId: true, position: true },
        }),
      ).toEqual([
        { boardId: "board001", appId: "app00001", position: 0 },
        { boardId: "board001", appId: "app00002", position: 1 },
      ])
      expect(
        (await db.app.findMany({ select: { createdAt: true } })).map((a) =>
          a.createdAt.toISOString(),
        ),
      ).toEqual([stamp, stamp])
    }
    await expectUpgraded()

    await db.$disconnect()
    db = new PrismaClient({
      adapter: new PrismaLibSql({ url: `file:${dbPath}` }),
    })
    await expectUpgraded()
  })
})
