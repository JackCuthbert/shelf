import { describe, expect, it, vi } from "vitest"

const { verifyApiKey } = vi.hoisted(() => ({ verifyApiKey: vi.fn() }))
vi.mock("@/lib/auth", () => ({ auth: { api: { verifyApiKey } } }))
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }))
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique } } }))

const { resolveApiUser } = await import("./auth")

describe("resolveApiUser", () => {
  it("requires one bearer token and never falls back to cookies", async () => {
    for (const authorization of [null, "Basic token", "Bearer a b"]) {
      const headers = new Headers({
        cookie: "better-auth.session_token=session",
      })
      if (authorization) headers.set("authorization", authorization)
      expect(await resolveApiUser(headers)).toBeNull()
    }
    expect(verifyApiKey).not.toHaveBeenCalled()
  })

  it("returns the owner of a valid API key", async () => {
    verifyApiKey.mockResolvedValueOnce({
      valid: true,
      key: { referenceId: "user-1" },
    })
    findUnique.mockResolvedValueOnce({ id: "user-1" })
    expect(
      await resolveApiUser(new Headers({ authorization: "Bearer secret" })),
    ).toEqual({ id: "user-1" })
  })

  it("rejects invalid and revoked keys", async () => {
    verifyApiKey.mockResolvedValueOnce({ valid: false, key: null })
    expect(
      await resolveApiUser(new Headers({ authorization: "Bearer revoked" })),
    ).toBeNull()
  })
  it("rejects a key whose account was deleted", async () => {
    verifyApiKey.mockResolvedValueOnce({
      valid: true,
      key: { referenceId: "deleted-user" },
    })
    findUnique.mockResolvedValueOnce(null)
    expect(
      await resolveApiUser(new Headers({ authorization: "Bearer orphan" })),
    ).toBeNull()
  })
})
