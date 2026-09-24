import { beforeEach, expect, it, vi } from "vitest"

const { updateUser, changePassword } = vi.hoisted(() => ({
  updateUser: vi.fn(),
  changePassword: vi.fn(),
}))
vi.mock("@/lib/auth-client", () => ({
  authClient: { updateUser, changePassword },
}))

import { updateDisplayName, updatePassword } from "./account-settings"

beforeEach(() => vi.clearAllMocks())

it("reports rejected display-name updates", async () => {
  updateUser.mockRejectedValue(new Error("offline"))
  await expect(updateDisplayName("Alex")).resolves.toContain("connection")
})

it("reports rejected password updates", async () => {
  changePassword.mockRejectedValue(new Error("offline"))
  await expect(
    updatePassword("old-password", "new-password"),
  ).resolves.toContain("connection")
})
