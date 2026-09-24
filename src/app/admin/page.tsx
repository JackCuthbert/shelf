import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminMenubar } from "@/components/admin-menubar"
import { BoardsAdmin } from "@/components/boards-admin"
import { prisma } from "@/lib/prisma"

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")
  const [apps, boards, user] = await Promise.all([
    prisma.app.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.board.findMany({
      where: { ownerId: session.user.id },
      include: {
        categories: { orderBy: { position: "asc" } },
        apps: { include: { app: true }, orderBy: { position: "asc" } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultBoardId: true },
    }),
  ])
  return (
    <>
      <AdminMenubar active="boards" user={{ name: session.user.name }} />
      <main className="mx-auto min-h-screen max-w-5xl px-5 pt-5 pb-8 sm:px-8">
        <BoardsAdmin
          initialBoards={boards.map((board) => ({
            ...board,
            createdAt: board.createdAt.toISOString(),
            updatedAt: board.updatedAt.toISOString(),
            categories: board.categories.map((category) => ({
              id: category.id,
              boardId: category.boardId,
              title: category.title,
              description: category.description,
              position: category.position,
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
          }))}
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
