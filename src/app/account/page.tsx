import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AccountSettings } from "@/components/account-settings"
import { AdminMenubar } from "@/components/admin-menubar"
import { getOidcProviderConfig } from "@/lib/oidc"
import { prisma } from "@/lib/prisma"

export default async function AccountPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")
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
      <main className="mx-auto min-h-screen max-w-5xl space-y-5 px-5 pt-5 pb-8 sm:px-8">
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
