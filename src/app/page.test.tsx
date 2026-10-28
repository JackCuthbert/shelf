import { expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
const session = vi.hoisted(() => ({
  current: null as null | { user: { id: string; name: string } },
}))
const userFind = vi.hoisted(() => vi.fn())
const boardFind = vi.hoisted(() => vi.fn())
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => session.current } },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: async () => 0, findUnique: userFind },
    board: { findMany: vi.fn(async () => []), findFirst: boardFind },
  },
}))

import HomePage from "./page"

it("sends the first visitor to account setup on the login page", async () => {
  await expect(HomePage()).rejects.toMatchObject({
    digest: expect.stringContaining("/login"),
  })
})

it("passes saved light and dark icon references to the home board", async () => {
  const saved = {
    iconHash: "light-hash",
    darkIconSource: "url",
    darkIconSlug: null,
    darkCustomIconUrl: "https://plex.example/dark.png",
    darkIconHash: "dark-hash",
  }
  session.current = { user: { id: "u1", name: "Jack" } }
  userFind.mockResolvedValue({ defaultBoardId: "b1" })
  boardFind.mockResolvedValue({
    id: "b1",
    name: "Home",
    categories: [],
    apps: [
      {
        categoryId: null,
        app: {
          id: "plex",
          ownerId: "u1",
          name: "Plex",
          description: "",
          url: "https://plex.example",
          iconSource: "dashboard",
          iconSlug: "plex",
          customIconUrl: null,
          ...saved,
          status: "up",
          statusChecksEnabled: false,
          lastCheckedAt: null,
          lastError: null,
          probeRequestedAt: null,
        },
      },
    ],
  })
  const element = (await HomePage()) as { props: { apps: unknown[] } }
  session.current = null
  expect(element.props.apps[0]).toMatchObject(saved)
})
