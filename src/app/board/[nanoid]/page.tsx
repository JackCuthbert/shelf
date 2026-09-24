import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BoardSearch } from "@/components/board-search"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"

export const dynamic = "force-dynamic"

export default async function BoardPage({
  params,
}: {
  params: Promise<{ nanoid: string }>
}) {
  const { nanoid } = await params
  const [board, session] = await Promise.all([
    prisma.board.findUnique({
      where: { nanoid },
      include: {
        apps: { include: { app: true }, orderBy: { position: "asc" } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])
  if (!board) notFound()
  return (
    <BoardSearch
      boardName={board.name}
      user={session ? { name: session.user.name } : null}
      apps={board.apps.map(({ app }) => ({
        id: app.id,
        name: app.name,
        description: app.description,
        url: app.url,
        iconSlug: app.iconSlug,
      }))}
    />
  )
}
