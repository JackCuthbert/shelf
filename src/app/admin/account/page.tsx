import { headers } from "next/headers"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AccountSettings } from "@/components/account-settings"
import { AdminMenubar } from "@/components/admin-menubar"
import { getOidcProviderConfig } from "@/lib/oidc"
import { prisma } from "@/lib/prisma"
import { appTitle } from "@/lib/page-title"

export const metadata: Metadata = { title: appTitle("Account") }

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const oidcProvider = getOidcProviderConfig(process.env)
  const oidcAccount = oidcProvider
    ? await prisma.account.findFirst({
        where: {
          userId: session.user.id,
          providerId: oidcProvider.providerId,
        },
        select: { id: true },
      })
    : null
  return (
    <>
      <AdminMenubar active="account" user={{ name: session.user.name }} />
      <main className="mx-auto w-full flex-1 max-w-5xl space-y-5 px-4 pt-5 pb-8 sm:px-6">
        <h1 className="text-2xl font-semibold">Account settings</h1>
        <AccountSettings
          name={session.user.name}
          email={session.user.email}
          oidc={
            oidcProvider
              ? { name: oidcProvider.name, connected: Boolean(oidcAccount) }
              : undefined
          }
        />
      </main>
    </>
  )
}
