import { headers } from "next/headers"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { AdminMenubar } from "@/components/admin-menubar"
import { SharedApps } from "@/components/shared-apps"
import { prisma } from "@/lib/prisma"
import { appTitle } from "@/lib/page-title"

export const metadata: Metadata = { title: appTitle("Apps") }

export default async function AdminAppsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const apps = await prisma.app.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
  })
  return (
    <>
      <AdminMenubar active="apps" user={{ name: session.user.name }} />
      <main className="mx-auto min-h-screen max-w-5xl px-4 pt-5 pb-8 sm:px-6">
        <SharedApps
          initialApps={apps.map((app) => ({
            ...app,
            lastCheckedAt: app.lastCheckedAt?.toISOString() ?? null,
            createdAt: app.createdAt.toISOString(),
            updatedAt: app.updatedAt.toISOString(),
          }))}
        />
      </main>
    </>
  )
}
