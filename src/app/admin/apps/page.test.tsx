import { expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({
  redirect: () => {
    throw new Error("redirect")
  },
  notFound: () => {
    throw new Error("not found")
  },
}))
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: async () => ({ user: { id: "u1", name: "Jack" } }),
    },
  },
}))

const row = {
  id: "plex",
  ownerId: "u1",
  name: "Plex",
  description: "",
  url: "https://plex.example",
  iconSource: "dashboard",
  iconSlug: "plex",
  customIconUrl: null,
  iconHash: "light-hash",
  darkIconSource: "url",
  darkIconSlug: null,
  darkCustomIconUrl: "https://plex.example/dark.png",
  darkIconHash: "dark-hash",
  status: "up",
  statusChecksEnabled: false,
  lastCheckedAt: null,
  lastError: null,
  probeRequestedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
}
const saved = {
  iconHash: "light-hash",
  darkIconSource: "url",
  darkIconSlug: null,
  darkCustomIconUrl: "https://plex.example/dark.png",
  darkIconHash: "dark-hash",
}

vi.mock("@/lib/prisma", () => ({
  prisma: { app: { findMany: async () => [row] } },
}))

import AdminAppsPage from "./page"

type Tree = { props: { children?: Tree | Tree[]; initialApps?: unknown[] } }

function find(node: Tree, key: "initialApps"): unknown[] | undefined {
  if (node.props[key]) return node.props[key]!
  const children = [node.props.children].flat().filter(Boolean) as Tree[]
  for (const child of children) {
    const found = child.props ? find(child, key) : undefined
    if (found) return found
  }
}

it("passes saved light and dark icon references to the app library", async () => {
  const apps = find((await AdminAppsPage()) as Tree, "initialApps")
  expect(apps?.[0]).toMatchObject(saved)
})
