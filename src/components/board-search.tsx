"use client"

import { useEffect, useMemo, useState } from "react"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { LuInfo, LuLayoutDashboard } from "react-icons/lu"
import {
  filterAppGroups,
  groupBoardApps,
  type CategorySummary,
} from "@/lib/board-search"
import { UserMenu } from "@/components/user-menu"
import { trpc } from "@/components/trpc-provider"
import type { AppStatus } from "@/server/app-status-service"

type BoardApp = {
  id: string
  name: string
  description: string
  url: string
  iconSlug: string
  categoryId: string | null
  status: AppStatus
  lastCheckedAt: number | null
}

function statusLabel(status: AppStatus) {
  if (status === "up") return "Responding"
  if (status === "down") return "Not responding"
  return "Status unknown"
}

function statusColor(status: AppStatus, checking: boolean) {
  if (checking) return "bg-muted motion-safe:animate-pulse"
  if (status === "up") return "bg-green-600 dark:bg-green-400"
  if (status === "down") return "bg-danger"
  return "bg-muted"
}

export function descriptionTileHandlers(
  appId: string,
  hasDescription: boolean,
  open: (id: string) => void,
) {
  const showDescription = () => {
    if (hasDescription) open(appId)
  }
  return { onMouseEnter: showDescription, onFocus: showDescription }
}

export function BoardSearch({
  boardName,
  boardNanoid,
  apps,
  categories,
  user,
}: {
  boardName: string
  boardNanoid: string
  apps: BoardApp[]
  categories: CategorySummary[]
  user: { name: string } | null
}) {
  const [query, setQuery] = useState("")
  const [checking, setChecking] = useState(false)
  const [openDescription, setOpenDescription] = useState<string | null>(null)
  const [statuses, setStatuses] = useState(() =>
    Object.fromEntries(
      apps.map((app) => [
        app.id,
        { status: app.status, lastCheckedAt: app.lastCheckedAt },
      ]),
    ),
  )
  const refreshStatuses = trpc.boards.refreshStatuses.useMutation()
  const groups = useMemo(
    () => filterAppGroups(groupBoardApps(apps, categories), query),
    [apps, categories, query],
  )
  const hasMatches = groups.some((group) => group.apps.length > 0)
  const boardIsEmpty = apps.length === 0 && categories.length === 0

  useEffect(() => {
    if (apps.length === 0) return
    let active = true
    setChecking(true)
    refreshStatuses
      .mutateAsync({ nanoid: boardNanoid })
      .then((result) => {
        if (!active) return
        setStatuses(Object.fromEntries(result.map((app) => [app.id, app])))
      })
      .catch(() => {})
      .finally(() => {
        if (active) setChecking(false)
      })
    return () => {
      active = false
    }
  }, [apps.length, boardNanoid, refreshStatuses.mutateAsync])

  function renderTile(app: BoardApp) {
    const status = statuses[app.id] ?? app
    const label = checking ? "Checking" : statusLabel(status.status)
    const checked = checking
      ? "status in progress"
      : status.lastCheckedAt === null
        ? "not checked yet"
        : `last checked ${new Date(status.lastCheckedAt).toISOString()}`
    return (
      <li key={app.id}>
        <Popover.Root
          open={openDescription === app.id}
          onOpenChange={(open) => setOpenDescription(open ? app.id : null)}
        >
          <div className="relative">
            <a
              href={app.url}
              target="_blank"
              rel="noreferrer"
              title={app.name}
              {...descriptionTileHandlers(
                app.id,
                Boolean(app.description),
                setOpenDescription,
              )}
              className="panel flex aspect-square w-full flex-col items-center gap-1.5 p-2 transition hover:border-accent hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:bg-surface-alt"
            >
              <span className="w-full shrink-0 truncate text-center text-sm font-medium leading-5">
                {app.name}
              </span>
              <span className="flex min-h-0 w-full flex-1 items-center justify-center p-2">
                <img
                  src={`/icons/${app.iconSlug}`}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </span>
              <span
                role="img"
                aria-label={`${label}; ${checked}`}
                title={checked}
                className={`absolute bottom-2 right-2 size-2 rounded-full ring-2 ring-background ${statusColor(status.status, checking)}`}
              />
            </a>
            {app.description && (
              <>
                <Popover.Trigger
                  openOnHover
                  delay={0}
                  aria-label={`About ${app.name}`}
                  className="absolute right-1 top-1 flex size-8 items-center justify-center border border-line bg-background text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
                >
                  <LuInfo aria-hidden className="size-4" />
                </Popover.Trigger>
                <Popover.Portal>
                  <Popover.Positioner side="top" sideOffset={8}>
                    <Popover.Popup
                      className="panel max-w-64 p-3 text-sm shadow-lg"
                      aria-label={`${app.name} description`}
                    >
                      {app.description}
                    </Popover.Popup>
                  </Popover.Positioner>
                </Popover.Portal>
              </>
            )}
          </div>
        </Popover.Root>
      </li>
    )
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-background">
        <div className="mx-auto grid max-w-5xl grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] sm:gap-4 sm:px-6">
          <div className="order-1 flex min-w-0 items-center gap-2">
            <LuLayoutDashboard aria-hidden className="size-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs leading-none text-muted">Hometime</p>
              <h1
                className="truncate text-base font-semibold leading-tight"
                title={boardName}
              >
                {boardName}
              </h1>
            </div>
          </div>
          <div className="order-3 col-span-2 sm:order-2 sm:col-span-1">
            <label htmlFor="board-search" className="sr-only">
              Search apps
            </label>
            <Input
              id="board-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps…"
              aria-controls="board-app-results"
              className="field"
            />
          </div>
          <div className="order-2 min-w-0 justify-self-end sm:order-3">
            <UserMenu user={user} />
          </div>
        </div>
      </header>
      <div
        id="board-app-results"
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6"
      >
        {boardIsEmpty ? (
          <p className="panel px-6 py-12 text-center text-muted">
            This board is empty. The board owner can add apps from admin.
          </p>
        ) : query.trim() && !hasMatches ? (
          <p role="status" className="panel px-6 py-12 text-center text-muted">
            No apps match “{query}”.
          </p>
        ) : (
          <div className="space-y-8">
            {groups.map((group) => (
              <section
                key={group.category?.id ?? "uncategorized"}
                aria-label={group.category?.title ?? "Uncategorized apps"}
              >
                {group.category && (
                  <header className="mb-3">
                    <h2 className="text-base font-semibold">
                      {group.category.title}
                    </h2>
                    {group.category.description && (
                      <p className="mt-1 text-sm text-muted">
                        {group.category.description}
                      </p>
                    )}
                  </header>
                )}
                {group.apps.length === 0 ? (
                  <p className="text-sm text-muted">No apps assigned.</p>
                ) : (
                  <ul className="grid grid-cols-[repeat(auto-fit,8.5rem)] gap-3 sm:gap-4">
                    {group.apps.map(renderTile)}
                  </ul>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
