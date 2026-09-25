import { headers } from "next/headers"
import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { AdminMenubar } from "@/components/admin-menubar"
import { BoardsListAdmin } from "@/components/boards-list-admin"
import { prisma } from "@/lib/prisma"
import { appTitle } from "@/lib/page-title"

export const metadata: Metadata = { title: appTitle("Boards") }

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/")
  const [boards, user] = await Promise.all([
    prisma.board.findMany({
      where: { ownerId: session.user.id },
      select: {
        id: true,
        name: true,
        nanoid: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
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
      <main className="mx-auto min-h-screen max-w-5xl px-4 pt-5 pb-8 sm:px-6">
        <BoardsListAdmin
          initialBoards={boards.map((board) => ({
            ...board,
            createdAt: board.createdAt.toISOString(),
            updatedAt: board.updatedAt.toISOString(),
          }))}
          initialDefaultBoardId={user?.defaultBoardId ?? null}
        />
      </main>
    </>
  )
}
