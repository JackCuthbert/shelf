import { cache } from "react"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { LuExternalLink } from "react-icons/lu"
import { PublicBoardNav } from "@/components/public-board-nav"
import { AppDetailEditAction } from "@/components/app-detail-edit-action"
import { AppDetailCheckAction } from "@/components/app-detail-check-action"
import { AppDetailCopyAction } from "@/components/app-detail-copy-action"
import { LocalDateTime } from "@/components/local-date-time"
import { auth } from "@/lib/auth"
import { iconKey } from "@/lib/app-icon"
import { APP_NAME, siteTitle } from "@/lib/page-title"
import { STATUS_FRESHNESS_MS, type AppStatusSnapshot } from "@/lib/app-status"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const findApp = cache((id: string) =>
  prisma.app.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      boards: {
        include: { board: { select: { id: true, name: true } } },
        orderBy: { board: { name: "asc" } },
      },
    },
  }),
)

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const app = await findApp(id)
  return { title: app ? siteTitle(app.name) : APP_NAME }
}

export default async function AppPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [app, session] = await Promise.all([
    findApp(id),
    auth.api.getSession({ headers: await headers() }),
  ])
  if (!app) notFound()
  const isOwner = session?.user.id === app.ownerId
  const [boards, viewer] = await Promise.all([
    prisma.board.findMany({
      select: {
        id: true,
        name: true,
        ownerId: true,
        owner: { select: { name: true } },
      },
      orderBy: [{ owner: { name: "asc" } }, { name: "asc" }, { id: "asc" }],
    }),
    session
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          select: { defaultBoardId: true },
        })
      : Promise.resolve(null),
  ])

  return (
    <div className="flex flex-1 flex-col">
      <PublicBoardNav
        boardName="Apps"
        boards={boards.map(({ owner, ...item }) => ({
          ...item,
          ownerName: owner.name,
        }))}
        defaultBoardId={viewer?.defaultBoardId ?? null}
        user={session ? { id: session.user.id, name: session.user.name } : null}
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 sm:px-6">
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:gap-8">
          <div className="panel flex size-36 shrink-0 items-center justify-center p-6 sm:size-44">
            <img
              src={`/icons/${iconKey(app)}`}
              alt=""
              className="size-full object-contain"
            />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-3xl font-semibold">{app.name}</h1>
            <p className="mt-1 text-sm text-muted">by {app.owner.name}</p>
            {app.description && (
              <p className="mt-4 text-muted">{app.description}</p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-primary"
              >
                <LuExternalLink aria-hidden className="size-4" />
                Open app
              </a>
              {isOwner && (
                <AppDetailEditAction
                  app={{
                    id: app.id,
                    name: app.name,
                    description: app.description,
                    url: app.url,
                    iconSource: app.iconSource,
                    iconSlug: app.iconSlug,
                    customIconUrl: app.customIconUrl,
                  }}
                />
              )}
            </div>
          </div>
        </div>

        <dl className="panel mt-8 divide-y divide-line px-4 sm:px-6">
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Website</dt>
            <dd className="flex min-w-0 items-center gap-3 text-sm">
              <a
                href={app.url}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 break-all underline underline-offset-2 hover:text-muted"
              >
                {app.url}
              </a>
              <AppDetailCopyAction url={app.url} />
            </dd>
          </div>
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Owner</dt>
            <dd className="text-sm">{app.owner.name}</dd>
          </div>
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Icon source</dt>
            <dd className="min-w-0 break-all text-sm">
              {app.iconSource === "url" ? (
                <>
                  <span>Custom image</span>
                  {app.customIconUrl && (
                    <>
                      {" "}
                      ·{" "}
                      <a
                        href={app.customIconUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        {app.customIconUrl}
                      </a>
                    </>
                  )}
                </>
              ) : (
                <>Dashboard Icons{app.iconSlug ? ` · ${app.iconSlug}` : ""}</>
              )}
            </dd>
          </div>
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Status</dt>
            <dd className="flex w-full flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden
                  className={`size-2.5 rounded-full ${app.status === "up" ? "bg-green-600 dark:bg-green-400" : app.status === "down" ? "bg-danger" : "bg-muted"}`}
                />
                {app.status === "up"
                  ? "Responding"
                  : app.status === "down"
                    ? "Not responding"
                    : "Not checked yet"}
              </span>
              {session && (
                <AppDetailCheckAction
                  appId={app.id}
                  appName={app.name}
                  snapshot={
                    {
                      id: app.id,
                      status:
                        app.status === "up" || app.status === "down"
                          ? app.status
                          : "unknown",
                      lastCheckedAt: app.lastCheckedAt?.getTime() ?? null,
                      lastError: app.lastError,
                      checking:
                        app.probeRequestedAt ||
                        !app.lastCheckedAt ||
                        Date.now() - app.lastCheckedAt.getTime() >=
                          STATUS_FRESHNESS_MS
                          ? true
                          : false,
                    } satisfies AppStatusSnapshot
                  }
                />
              )}
            </dd>
          </div>
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Added</dt>
            <dd className="text-sm">
              <time dateTime={app.createdAt.toISOString()}>
                {new Intl.DateTimeFormat("en-AU", { dateStyle: "long" }).format(
                  app.createdAt,
                )}
              </time>
            </dd>
          </div>
          <div className="grid items-center gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Last checked</dt>
            <dd className="text-sm">
              {app.lastCheckedAt ? (
                <time dateTime={app.lastCheckedAt.toISOString()}>
                  <LocalDateTime
                    value={app.lastCheckedAt.toISOString()}
                    fallback="…"
                  />
                </time>
              ) : (
                "Never"
              )}
            </dd>
          </div>
          <div className="grid items-start gap-1 py-4 sm:grid-cols-[9rem_1fr] sm:gap-4">
            <dt className="text-sm text-muted">Public boards</dt>
            <dd className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
              {app.boards.length
                ? app.boards.map(({ board }) => (
                    <a
                      key={board.id}
                      href={`/board/${encodeURIComponent(board.id)}`}
                      className="underline underline-offset-2 hover:text-muted"
                    >
                      {board.name}
                    </a>
                  ))
                : "Not on any public boards"}
            </dd>
          </div>
        </dl>
      </main>
    </div>
  )
}
