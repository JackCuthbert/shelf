import { expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: async () => null } },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { count: async () => 0 },
    board: { findMany: vi.fn(async () => []) },
  },
}))

import HomePage from "./page"

it("sends the first visitor to account setup on the login page", async () => {
  await expect(HomePage()).rejects.toMatchObject({
    digest: expect.stringContaining("/login"),
  })
})
