import { headers } from "next/headers"
import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { AdminMenubar } from "@/components/admin-menubar"
import { BoardsAdmin } from "@/components/boards-admin"
import { auth } from "@/lib/auth"
import { appTitle } from "@/lib/page-title"
import { prisma } from "@/lib/prisma"

export const metadata: Metadata = { title: appTitle("Boards") }

export default async function AdminBoardPage({
  params,
}: {
  params: Promise<{ boardId: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  const { boardId: boardNanoid } = await params
  const [board, apps, user] = await Promise.all([
    prisma.board.findFirst({
      where: { nanoid: boardNanoid, ownerId: session.user.id },
      include: {
        categories: { orderBy: { position: "asc" } },
        apps: { include: { app: true }, orderBy: { position: "asc" } },
      },
    }),
    prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultBoardId: true },
    }),
  ])
  if (!board) notFound()
  return (
    <>
      <AdminMenubar
        active="boards"
        user={{ name: session.user.name }}
        board={{
          id: board.id,
          name: board.name,
          categories: board.categories.map(({ id, title }) => ({ id, title })),
        }}
      />
      <main className="mx-auto min-h-screen max-w-5xl px-4 pt-5 pb-8 sm:px-6">
        <BoardsAdmin
          boardNanoid={board.nanoid}
          initialBoards={[
            {
              ...board,
              createdAt: board.createdAt.toISOString(),
              updatedAt: board.updatedAt.toISOString(),
              categories: board.categories.map((category) => ({
                ...category,
                createdAt: category.createdAt.toISOString(),
                updatedAt: category.updatedAt.toISOString(),
              })),
              apps: board.apps.map((entry) => ({
                ...entry,
                app: {
                  ...entry.app,
                  lastCheckedAt: entry.app.lastCheckedAt?.toISOString() ?? null,
                  createdAt: entry.app.createdAt.toISOString(),
                  updatedAt: entry.app.updatedAt.toISOString(),
                },
              })),
            },
          ]}
          initialApps={apps.map((app) => ({
            ...app,
            lastCheckedAt: app.lastCheckedAt?.toISOString() ?? null,
            createdAt: app.createdAt.toISOString(),
            updatedAt: app.updatedAt.toISOString(),
          }))}
          initialDefaultBoardId={user?.defaultBoardId ?? null}
        />
      </main>
    </>
  )
}
