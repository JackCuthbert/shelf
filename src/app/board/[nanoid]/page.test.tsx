import { expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("not found")
  },
}))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => null } },
}))

const saved = {
  iconHash: "light-hash",
  darkIconSource: "url",
  darkIconSlug: null,
  darkCustomIconUrl: "https://plex.example/dark.png",
  darkIconHash: "dark-hash",
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    board: {
      findUnique: async () => ({
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
      }),
      findMany: async () => [],
    },
  },
}))

import BoardPage from "./page"

it("passes saved light and dark icon references to the public board", async () => {
  const element = (await BoardPage({
    params: Promise.resolve({ nanoid: "b1" }),
  })) as { props: { apps: unknown[] } }
  expect(element.props.apps[0]).toMatchObject(saved)
})
