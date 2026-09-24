import { expect, it } from "vitest"
import { getOidcProviderConfig } from "./oidc"

it("does not configure OIDC when no provider settings are supplied", () => {
  expect(getOidcProviderConfig({})).toBeNull()
})

it("uses OIDC discovery and the standard identity scopes", () => {
  expect(
    getOidcProviderConfig({
      OIDC_ISSUER: "https://id.example.com/",
      OIDC_CLIENT_ID: "hometime",
      OIDC_CLIENT_SECRET: "secret",
    }),
  ).toMatchObject({
    providerId: "oidc",
    discoveryUrl: "https://id.example.com/.well-known/openid-configuration",
    clientId: "hometime",
    clientSecret: "secret",
    scopes: ["openid", "email", "profile"],
    disableImplicitSignUp: true,
  })
})

it("rejects incomplete OIDC settings", () => {
  expect(() =>
    getOidcProviderConfig({ OIDC_ISSUER: "https://id.example.com" }),
  ).toThrow("OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET")
})

it("rejects issuer URLs without an HTTP scheme", () => {
  expect(() =>
    getOidcProviderConfig({
      OIDC_ISSUER: "javascript:alert(1)",
      OIDC_CLIENT_ID: "hometime",
      OIDC_CLIENT_SECRET: "secret",
    }),
  ).toThrow("OIDC_ISSUER must be an HTTP or HTTPS URL")
})
