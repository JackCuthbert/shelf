import { cache } from "react"
import { headers } from "next/headers"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { LuExternalLink } from "react-icons/lu"
import { AdminMenubar } from "@/components/admin-menubar"
import { AnonymousPageNav } from "@/components/anonymous-page-nav"
import { AppDetailEditAction } from "@/components/app-detail-edit-action"
import { AppDetailCheckAction } from "@/components/app-detail-check-action"
import { AppDetailCopyAction } from "@/components/app-detail-copy-action"
import { auth } from "@/lib/auth"
import { iconKey } from "@/lib/app-icon"
import { APP_NAME, siteTitle } from "@/lib/page-title"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

const findApp = cache((id: string) =>
  prisma.app.findUnique({
    where: { id },
    include: { owner: { select: { name: true } } },
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

  return (
    <div className="flex flex-1 flex-col">
      {session ? (
        <AdminMenubar active={null} user={{ name: session.user.name }} />
      ) : (
        <AnonymousPageNav />
      )}
      <main
        className={`mx-auto w-full max-w-3xl flex-1 px-5 sm:px-6 ${session ? "py-10" : "pt-24 pb-10"}`}
      >
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
                <AppDetailCheckAction appId={app.id} appName={app.name} />
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
        </dl>
      </main>
    </div>
  )
}
