import { beforeEach, describe, expect, it, vi } from "vitest"

const { getSession, verifyPassword, update } = vi.hoisted(() => ({
  getSession: vi.fn(),
  verifyPassword: vi.fn(),
  update: vi.fn(),
}))
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession, verifyPassword } } }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { update } } }))

import { POST } from "./route"

function request(body: unknown) {
  return new Request("http://localhost/api/account/email", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/account/email", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getSession.mockResolvedValue({ user: { id: "current" } })
    verifyPassword.mockResolvedValue({ status: true })
    update.mockResolvedValue({ email: "new@example.com" })
  })

  it("requires an authenticated session", async () => {
    getSession.mockResolvedValue(null)
    const response = await POST(
      request({ email: "new@example.com", currentPassword: "secret" }),
    )
    expect(response.status).toBe(401)
  })
  it("rejects an incorrect current password", async () => {
    verifyPassword.mockRejectedValue(new Error("invalid"))
    const response = await POST(
      request({ email: "new@example.com", currentPassword: "wrong" }),
    )
    expect(response.status).toBe(401)
    expect(update).not.toHaveBeenCalled()
  })
  it("validates and normalizes email", async () => {
    const response = await POST(
      request({ email: "invalid", currentPassword: "secret" }),
    )
    expect(response.status).toBe(400)
    expect(verifyPassword).not.toHaveBeenCalled()
  })
  it("returns a useful duplicate email error", async () => {
    update.mockRejectedValue({ code: "P2002" })
    const response = await POST(
      request({ email: "new@example.com", currentPassword: "secret" }),
    )
    expect(response.status).toBe(409)
    expect(await response.json()).toHaveProperty("error")
  })
  it("updates only the authenticated user and returns the normalized address", async () => {
    const response = await POST(
      request({ email: " New@Example.com ", currentPassword: "secret" }),
    )
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ email: "new@example.com" })
    expect(verifyPassword).toHaveBeenCalledWith({
      body: { password: "secret" },
      headers: expect.any(Headers),
    })
    expect(update).toHaveBeenCalledWith({
      where: { id: "current" },
      data: { email: "new@example.com" },
      select: { email: true },
    })
  })
})
