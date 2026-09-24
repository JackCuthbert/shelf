import { betterAuth } from "better-auth"
import { prismaAdapter } from "better-auth/adapters/prisma"
import { prisma } from "./prisma"

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
