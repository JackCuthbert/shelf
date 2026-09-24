import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminMenubar } from "@/components/admin-menubar"
import { SharedApps } from "@/components/shared-apps"
import { prisma } from "@/lib/prisma"

export default async function AdminAppsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")
  const apps = await prisma.app.findMany({
    orderBy: [{ name: "asc" }, { id: "asc" }],
  })
  return (
    <>
      <AdminMenubar active="apps" user={{ name: session.user.name }} />
      <main className="mx-auto min-h-screen max-w-5xl px-5 pt-5 pb-8 sm:px-8">
        <SharedApps
          initialApps={apps.map((app) => ({
            ...app,
            createdAt: app.createdAt.toISOString(),
            updatedAt: app.updatedAt.toISOString(),
          }))}
        />
      </main>
    </>
  )
}
