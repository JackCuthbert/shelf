"use client"

import { useMemo, useState } from "react"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { LuInfo, LuLayoutDashboard, LuSettings } from "react-icons/lu"
import { rankApps } from "@/lib/board-search"

type BoardApp = {
  id: string
  name: string
  description: string
  url: string
  iconSlug: string
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
  apps,
}: {
  boardName: string
  apps: BoardApp[]
}) {
  const [query, setQuery] = useState("")
  const [openDescription, setOpenDescription] = useState<string | null>(null)
  const results = useMemo(() => rankApps(apps, query), [apps, query])

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
          <a href="/admin" className="btn order-2 justify-self-end sm:order-3">
            <LuSettings aria-hidden className="size-4" />
            Admin
          </a>
        </div>
      </header>
      <div
        id="board-app-results"
        className="mx-auto max-w-5xl px-4 py-6 sm:px-6"
      >
        {apps.length === 0 ? (
          <p className="panel px-6 py-12 text-center text-muted">
            This board is empty. The board owner can add apps from admin.
          </p>
        ) : results.length === 0 ? (
          <p role="status" className="panel px-6 py-12 text-center text-muted">
            No apps match “{query}”.
          </p>
        ) : (
          <ul className="grid grid-cols-[repeat(auto-fit,8.5rem)] gap-3 sm:gap-4">
            {results.map((app) => (
              <li key={app.id}>
                <Popover.Root
                  open={openDescription === app.id}
                  onOpenChange={(open) =>
                    setOpenDescription(open ? app.id : null)
                  }
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
            ))}
          </ul>
        )}
      </div>
    </main>
  )
}
