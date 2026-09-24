import { cache } from "react"
import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { iconKey } from "@/lib/app-icon"
import { BoardSearch } from "@/components/board-search"
import { auth } from "@/lib/auth"
import { APP_NAME, siteTitle } from "@/lib/page-title"

export const dynamic = "force-dynamic"

const findBoard = cache((nanoid: string) =>
  prisma.board.findUnique({
    where: { nanoid },
    include: {
      categories: { orderBy: { position: "asc" } },
      apps: { include: { app: true }, orderBy: { position: "asc" } },
    },
  }),
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nanoid: string }>
}): Promise<Metadata> {
  const { nanoid } = await params
  const board = await findBoard(nanoid)
  return { title: board ? siteTitle(board.name) : APP_NAME }
}

export default async function BoardPage({
  params,
}: {
  params: Promise<{ nanoid: string }>
}) {
  const { nanoid } = await params
  const [board, session] = await Promise.all([
    findBoard(nanoid),
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
        iconKey: iconKey(app),
        categoryId,
        status:
          app.status === "up" || app.status === "down" ? app.status : "unknown",
        lastCheckedAt: app.lastCheckedAt?.getTime() ?? null,
      }))}
    />
  )
}
