import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BoardSearch } from "@/components/board-search"

export const dynamic = "force-dynamic"

export default async function BoardPage({
  params,
}: {
  params: Promise<{ nanoid: string }>
}) {
  const { nanoid } = await params
  const board = await prisma.board.findUnique({
    where: { nanoid },
    include: { apps: { include: { app: true }, orderBy: { position: "asc" } } },
  })
  if (!board) notFound()
  return (
    <BoardSearch
      boardName={board.name}
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
