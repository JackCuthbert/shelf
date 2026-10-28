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

const board = {
  id: "b1",
  name: "Home",
  ownerId: "u1",
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  categories: [],
  apps: [{ id: "e1", categoryId: null, position: 0, app: row }],
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    board: { findFirst: async () => board },
    app: { findMany: async () => [row] },
    user: { findUnique: async () => ({ defaultBoardId: "b1" }) },
  },
}))

import AdminBoardPage from "./page"

type Tree = { props: { children?: Tree | Tree[]; initialBoards?: unknown[] } }

function find(node: Tree): Tree["props"] | undefined {
  if (node.props.initialBoards) return node.props
  for (const child of [node.props.children].flat().filter(Boolean) as Tree[]) {
    const found = child.props ? find(child) : undefined
    if (found) return found
  }
}

it("passes saved light and dark icon references to the managed board", async () => {
  const element = (await AdminBoardPage({
    params: Promise.resolve({ boardId: "b1" }),
  })) as Tree
  const props = find(element) as unknown as {
    initialBoards: { apps: { app: unknown }[] }[]
    initialApps: unknown[]
  }
  expect(props.initialBoards[0].apps[0].app).toMatchObject(saved)
  expect(props.initialApps[0]).toMatchObject(saved)
})
