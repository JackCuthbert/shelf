import { describe, expect, it } from "vitest"
import { canCreateFirstAccount, signupEnabled } from "./account-policy"

describe("account setup policy", () => {
  it("allows only the first account before the instance is claimed", () => {
    expect(canCreateFirstAccount(0, false)).toBe(true)
    expect(canCreateFirstAccount(1, false)).toBe(false)
    expect(canCreateFirstAccount(0, true)).toBe(false)
  })

  it("enables later signup only for the explicit true value", () => {
    expect(signupEnabled(undefined)).toBe(false)
    expect(signupEnabled("false")).toBe(false)
    expect(signupEnabled("TRUE")).toBe(false)
    expect(signupEnabled("true")).toBe(true)
  })
})
