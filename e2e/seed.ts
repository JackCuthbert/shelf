import { cp, mkdir, rm } from "node:fs/promises"
import { resolve } from "node:path"
import { execFileSync } from "node:child_process"
import { hashPassword } from "better-auth/crypto"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"

const directory = resolve("data/screenshots")
const databaseUrl = `file:${directory}/app.db`
if (process.env.DATABASE_URL !== databaseUrl) {
  throw new Error("Screenshot seeding requires its isolated database.")
}
await rm(directory, { recursive: true, force: true })
await mkdir(directory, { recursive: true })
await cp("e2e/fixtures/icons", `${directory}/icons`, { recursive: true })
execFileSync("node_modules/.bin/prisma", ["migrate", "deploy"], {
  stdio: "inherit",
})

const prisma = new PrismaClient({
  adapter: new PrismaLibSql({ url: databaseUrl }),
})
const createdAt = new Date("2026-09-01T10:00:00Z")
try {
  await prisma.user.create({
    data: {
      id: "demo-user",
      name: "Jack",
      email: "jack@example.com",
      emailVerified: true,
      createdAt,
      accounts: {
        create: {
          id: "demo-account",
          accountId: "demo-user",
          providerId: "credential",
          password: await hashPassword("shelf-screenshot-password"),
        },
      },
    },
  })
  await prisma.instance.create({
    data: { id: "singleton", state: "complete", token: "screenshot-setup" },
  })
  await prisma.board.create({
    data: {
      id: "homelab1",
      name: "Homelab",
      ownerId: "demo-user",
      categories: {
        create: [
          {
            id: "media",
            title: "Media",
            description: "Watch, listen, and explore.",
            position: 0,
          },
          {
            id: "tools",
            title: "Tools & infrastructure",
            description: "Keep everything running smoothly.",
            position: 1,
          },
        ],
      },
    },
  })
  await prisma.user.update({
    where: { id: "demo-user" },
    data: { defaultBoardId: "homelab1" },
  })
  const apps = [
    [
      "home-assistant",
      "Home Assistant",
      "Your home, connected. Lights, climate, and automations in one place.",
      null,
    ],
    [
      "jellyfin",
      "Jellyfin",
      "Your movies, shows, and music. Stream your personal collection on any device.",
      "media",
    ],
    [
      "immich",
      "Immich",
      "Back up photos and revisit your favourite moments.",
      "media",
    ],
    [
      "audiobookshelf",
      "Audiobookshelf",
      "Your audiobook and podcast library, always ready to play.",
      "media",
    ],
    [
      "grafana",
      "Grafana",
      "Dashboards for the metrics that matter in your homelab.",
      "tools",
    ],
    [
      "navidrome",
      "Navidrome",
      "Your music collection, ready to stream.",
      "media",
    ],
    ["sonarr", "Sonarr", "Organise your television library.", "media"],
    ["radarr", "Radarr", "Keep your movie collection organised.", "media"],
    [
      "paperless-ngx",
      "Paperless-ngx",
      "Searchable documents without the paper clutter.",
      null,
    ],
    [
      "vaultwarden",
      "Vaultwarden",
      "A secure home for your passwords.",
      "tools",
    ],
    ["syncthing", "Syncthing", "Keep your files in sync across devices.", null],
    [
      "portainer",
      "Portainer",
      "Manage containers, stacks, and services.",
      "tools",
    ],
    [
      "uptime-kuma",
      "Uptime Kuma",
      "A quick overview of service availability.",
      null,
    ],
  ] as const
  for (const [
    position,
    [id, name, description, categoryId],
  ] of apps.entries()) {
    await prisma.app.create({
      data: {
        id,
        name,
        description,
        ownerId: "demo-user",
        url: `https://${id}.home.arpa`,
        iconSlug: id,
        status: "up",
        lastCheckedAt: new Date(),
        createdAt,
        boards: { create: { boardId: "homelab1", categoryId, position } },
      },
    })
  }
} finally {
  await prisma.$disconnect()
}
