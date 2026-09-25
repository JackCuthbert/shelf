"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { LuInfo } from "react-icons/lu"
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
  iconKey: string
  categoryId: string | null
  status: AppStatus
  lastCheckedAt: number | null
}

function statusLabel(status: AppStatus) {
  if (status === "up") return "Responding"
  if (status === "down") return "Not responding"
  return "Status unknown"
}

export function statusColor(status: AppStatus, checking: boolean) {
  const base =
    status === "up"
      ? "bg-green-600 dark:bg-green-400"
      : status === "down"
        ? "bg-danger"
        : "bg-muted"
  return checking ? `${base} motion-safe:animate-pulse` : base
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

function BoardTile({
  app,
  status,
  checking,
  label,
  checked,
  open,
  onOpenChange,
}: {
  app: BoardApp
  status: AppStatus
  checking: boolean
  label: string
  checked: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const anchorRef = useRef<HTMLDivElement>(null)
  const hasDescription = Boolean(app.description)
  return (
    <li>
      <Popover.Root open={open} onOpenChange={onOpenChange}>
        <div ref={anchorRef} className="relative">
          <a
            href={app.url}
            target="_blank"
            rel="noreferrer"
            title={app.name}
            {...descriptionTileHandlers(app.id, hasDescription, () =>
              onOpenChange(true),
            )}
            onMouseLeave={() => onOpenChange(false)}
            onBlur={() => onOpenChange(false)}
            className="panel flex aspect-square w-full flex-col items-center gap-1.5 p-2 transition hover:border-accent hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus active:bg-surface-alt"
          >
            <span className="w-full shrink-0 truncate text-center text-sm font-medium leading-5">
              {app.name}
            </span>
            <span className="flex min-h-0 w-full flex-1 items-center justify-center p-2">
              <img
                src={`/icons/${app.iconKey}`}
                alt=""
                className="h-full w-full object-contain"
              />
            </span>
            <span
              role="img"
              aria-label={`${label}; ${checked}`}
              title={checked}
              className={`absolute bottom-2 right-2 size-2 rounded-full ring-2 ring-background ${statusColor(status, checking)}`}
            />
          </a>
          {hasDescription && (
            <>
              <Popover.Trigger
                openOnHover
                delay={0}
                aria-label={`About ${app.name}`}
                className="absolute bottom-1 left-1 hidden size-8 items-center justify-center border border-line bg-background text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus [@media(any-pointer:coarse)]:flex"
              >
                <LuInfo aria-hidden className="size-4" />
              </Popover.Trigger>
              <Popover.Portal>
                <Popover.Positioner
                  anchor={anchorRef}
                  side="top"
                  align="center"
                  sideOffset={8}
                  collisionPadding={8}
                  collisionAvoidance={{ side: "flip", align: "shift" }}
                  className="z-50"
                >
                  <Popover.Popup
                    className="panel pointer-events-none w-fit max-w-[min(20rem,calc(100vw-2rem))] p-3 text-xs shadow-lg outline-none"
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
    const label = checking
      ? status.status === "unknown"
        ? "Checking"
        : `${statusLabel(status.status)}, checking`
      : statusLabel(status.status)
    const checked =
      status.lastCheckedAt === null
        ? checking
          ? "not checked yet; checking now"
          : "not checked yet"
        : `last checked ${new Date(status.lastCheckedAt).toISOString()}${checking ? "; checking now" : ""}`
    return (
      <BoardTile
        key={app.id}
        app={app}
        status={status.status}
        checking={checking}
        label={label}
        checked={checked}
        open={openDescription === app.id}
        onOpenChange={(open) => setOpenDescription(open ? app.id : null)}
      />
    )
  }

  return (
    <main className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-background">
        <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-x-3 gap-y-2 px-4 py-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)] sm:gap-4 sm:px-6">
          <div className="order-1 min-w-0">
            <div className="min-w-0">
              <p className="text-xs leading-none text-muted">Shelf</p>
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
        className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
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
                  <ul className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
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
