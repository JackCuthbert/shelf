import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { iconKey } from "@/lib/app-icon"
import { BoardSearch } from "@/components/board-search"
import { AnonymousPageNav } from "@/components/anonymous-page-nav"
import { LuArrowRight } from "react-icons/lu"

export const dynamic = "force-dynamic"

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (session) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { defaultBoardId: true },
    })
    const board = user?.defaultBoardId
      ? await prisma.board.findFirst({
          where: { id: user.defaultBoardId, ownerId: session.user.id },
          include: {
            categories: { orderBy: { position: "asc" } },
            apps: { include: { app: true }, orderBy: { position: "asc" } },
          },
        })
      : null
    if (!board) redirect("/admin/boards")
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        nanoid: true,
        name: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
      orderBy: [{ owner: { name: "asc" } }, { name: "asc" }, { id: "asc" }],
    })
    return (
      <BoardSearch
        boardName={board.name}
        boardNanoid={board.nanoid}
        boards={boards.map(({ owner, ...item }) => ({
          ...item,
          ownerName: owner.name,
        }))}
        user={{ id: session.user.id, name: session.user.name }}
        defaultBoardId={user?.defaultBoardId ?? null}
        categories={board.categories.map((category) => ({
          id: category.id,
          title: category.title,
          description: category.description,
        }))}
        apps={board.apps.map(({ app, categoryId }) => ({
          id: app.id,
          ownerId: app.ownerId,
          name: app.name,
          description: app.description,
          url: app.url,
          iconKey: iconKey(app),
          iconSource: app.iconSource,
          iconSlug: app.iconSlug,
          customIconUrl: app.customIconUrl,
          categoryId,
          status:
            app.status === "up" || app.status === "down"
              ? app.status
              : "unknown",
          lastCheckedAt: app.lastCheckedAt?.getTime() ?? null,
        }))}
      />
    )
  }

  const boards = await prisma.board.findMany({
    select: {
      id: true,
      nanoid: true,
      name: true,
      owner: { select: { name: true } },
    },
    orderBy: [{ owner: { name: "asc" } }, { name: "asc" }, { id: "asc" }],
  })
  return (
    <main className="relative flex flex-1 items-center justify-center px-5 py-16">
      <AnonymousPageNav showBoards={false} />
      <div className="w-full max-w-sm">
        <header className="mb-5">
          <h1 className="text-2xl font-semibold">Shelf</h1>
          <p className="mt-1 text-sm text-muted">Your home for every app.</p>
        </header>
        <ul className="panel space-y-0.5 p-1 shadow-lg">
          {boards.map((board) => (
            <li key={board.id}>
              <a
                href={`/board/${board.nanoid}`}
                className="group flex items-center gap-3 rounded-[2px] px-3 py-2 text-left hover:bg-surface-alt focus-visible:bg-surface-alt focus-visible:outline-2 focus-visible:outline-focus"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {board.name}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    by {board.owner.name}
                  </span>
                </span>
                <LuArrowRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-hover:text-foreground"
                />
              </a>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
