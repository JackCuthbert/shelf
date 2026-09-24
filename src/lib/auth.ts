import { betterAuth } from "better-auth"
import { APIError } from "better-auth/api"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { genericOAuth } from "better-auth/plugins"
import { canCreateAuthUser } from "./account-policy"
import { getOidcProviderConfig } from "./oidc"
import { prisma } from "./prisma"

const oidcProvider = getOidcProviderConfig(process.env)

const commonOptions = {
  appName: "Hometime",
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  trustedOrigins: process.env.BETTER_AUTH_URL
    ? [process.env.BETTER_AUTH_URL]
    : ["http://localhost:3000"],
  secret:
    process.env.BETTER_AUTH_SECRET ??
    "development-only-secret-change-me-32-chars",
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
}

export const auth = betterAuth({
  ...commonOptions,
  plugins: oidcProvider ? [genericOAuth({ config: [oidcProvider] })] : [],
  account: {
    encryptOAuthTokens: true,
    accountLinking: {
      enabled: true,
      disableImplicitLinking: true,
      trustedProviders: oidcProvider ? [oidcProvider.providerId] : [],
      allowDifferentEmails: true,
    },
  },
  databaseHooks: {
    user: {
      create: {
        before: async () => {
          if (
            !canCreateAuthUser(
              await prisma.user.count(),
              process.env.ENABLE_SIGNUP,
            )
          ) {
            throw new APIError("FORBIDDEN", {
              message:
                "Create the first account or enable sign-up to continue.",
            })
          }
        },
      },
    },
  },
  emailAndPassword: {
    ...commonOptions.emailAndPassword,
    disableSignUp: process.env.ENABLE_SIGNUP !== "true",
  },
})

// Server-only API instance: it has no HTTP handler and is used only after the
// setup endpoint has acquired its durable singleton claim.
export const setupAuth = betterAuth({
  ...commonOptions,
  basePath: "/__internal_setup_auth",
  emailAndPassword: { ...commonOptions.emailAndPassword, disableSignUp: false },
})
