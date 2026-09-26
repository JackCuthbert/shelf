import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { AccountForm } from "@/components/account-form"
import { signupEnabled } from "@/lib/account-policy"
import { getOidcProviderConfig } from "@/lib/oidc"
import { appTitle } from "@/lib/page-title"
import { LuLayoutGrid } from "react-icons/lu"

export const metadata: Metadata = { title: appTitle("Sign in") }

export default async function LoginPage() {
  const [userCount, instance] = await Promise.all([
    prisma.user.count(),
    prisma.instance.findUnique({ where: { id: "singleton" } }),
  ])
  const setup = userCount === 0 && !instance
  const signup = signupEnabled(process.env.ENABLE_SIGNUP)
  const oidcProvider = getOidcProviderConfig(process.env)
  return (
    <main className="relative min-h-screen px-6">
      <a href="/" className="btn absolute top-5 left-5 gap-1.5 text-xs">
        <LuLayoutGrid aria-hidden className="size-4" />
        Boards
      </a>
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center">
        <p className="mb-3 text-xs text-muted">Shelf</p>
        <h1 className="mb-2 text-3xl font-semibold">
          {setup ? "Make yourself at home." : "Welcome back."}
        </h1>
        <p className="mb-8 text-muted">
          {setup
            ? "Create the first account to set up this space."
            : signup
              ? "Sign in or create an account to continue."
              : "Sign in to continue to your dashboard."}
        </p>
        <AccountForm
          setup={setup}
          signup={signup}
          oidc={!setup && oidcProvider ? { name: oidcProvider.name } : undefined}
        />
      </div>
      <footer className="absolute inset-x-0 bottom-4 text-center text-xs text-muted">
        Built by <a href="https://jackcuthbert.dev" className="hover:underline">Jack Cuthbert</a>
      </footer>
    </main>
  )
}
