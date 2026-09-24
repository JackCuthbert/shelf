export type OidcEnvironment = Record<string, string | undefined>

export function getOidcProviderConfig(env: OidcEnvironment) {
  const issuerValue = env.OIDC_ISSUER?.trim() ?? ""
  const clientId = env.OIDC_CLIENT_ID?.trim() ?? ""
  const clientSecret = env.OIDC_CLIENT_SECRET?.trim() ?? ""
  if (!issuerValue && !clientId && !clientSecret) return null
  if (!issuerValue || !clientId || !clientSecret) {
    throw new Error(
      "OIDC_ISSUER, OIDC_CLIENT_ID, and OIDC_CLIENT_SECRET must all be configured.",
    )
  }

  let issuer: URL
  try {
    issuer = new URL(issuerValue)
  } catch {
    throw new Error("OIDC_ISSUER must be an HTTP or HTTPS URL.")
  }
  if (
    !["http:", "https:"].includes(issuer.protocol) ||
    issuer.username ||
    issuer.password ||
    issuer.search ||
    issuer.hash
  ) {
    throw new Error("OIDC_ISSUER must be an HTTP or HTTPS URL.")
  }

  const issuerUrl = issuer.toString().replace(/\/+$/, "")
  return {
    providerId: "oidc",
    name: env.OIDC_PROVIDER_NAME?.trim() || "OpenID Connect",
    clientId,
    clientSecret,
    discoveryUrl: `${issuerUrl}/.well-known/openid-configuration`,
    requireIdTokenVerification: true,
    disableImplicitSignUp: true,
    scopes: ["openid", "email", "profile"],
  }
}
