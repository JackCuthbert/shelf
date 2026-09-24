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
        categories: { orderBy: { position: "asc" } },
        apps: { include: { app: true }, orderBy: { position: "asc" } },
      },
    }),
    auth.api.getSession({ headers: await headers() }),
  ])
  if (!board) notFound()
  return (
    <BoardSearch
      boardName={board.name}
      boardNanoid={board.nanoid}
      user={session ? { name: session.user.name } : null}
      categories={board.categories.map((category) => ({
        id: category.id,
        title: category.title,
        description: category.description,
      }))}
      apps={board.apps.map(({ app, categoryId }) => ({
        id: app.id,
        name: app.name,
        description: app.description,
        url: app.url,
        iconSlug: app.iconSlug,
        categoryId,
        status:
          app.status === "up" || app.status === "down" ? app.status : "unknown",
        lastCheckedAt: app.lastCheckedAt?.getTime() ?? null,
      }))}
    />
  )
}
