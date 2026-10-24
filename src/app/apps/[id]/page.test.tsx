import { renderToStaticMarkup } from "react-dom/server"
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

const app = {
  id: "plex",
  ownerId: "u1",
  name: "Plex",
  description: "Movies and shows",
  url: "https://plex.example",
  iconSource: "dashboard",
  iconSlug: "plex",
  customIconUrl: null,
  iconHash: null,
  status: "up",
  statusChecksEnabled: true,
  lastError: null,
  lastCheckedAt: new Date("2026-09-24T00:00:00Z"),
  probeRequestedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
  owner: { name: "Jack" },
  boards: [],
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    app: { findUnique: async () => app },
    board: { findMany: async () => [] },
    user: { findUnique: async () => null },
  },
}))

import AppPage from "./page"

async function render(overrides: Partial<typeof app> = {}) {
  Object.assign(app, overrides)
  return renderToStaticMarkup(
    await AppPage({ params: Promise.resolve({ id: app.id }) }),
  )
}

it("shows status details for an app with checks enabled", async () => {
  const html = await render({ statusChecksEnabled: true })
  expect(html).toContain("Status")
  expect(html).toContain("Last checked")
  expect(html).toContain("Responding")
  expect(html).toContain("Movies and shows")
})

it("hides status details for an app with checks disabled", async () => {
  const html = await render({ statusChecksEnabled: false })
  expect(html).not.toContain("Status")
  expect(html).not.toContain("Last checked")
  expect(html).not.toContain("Not checked yet")
  expect(html).toContain("Movies and shows")
  expect(html).toContain('href="https://plex.example"')
})
