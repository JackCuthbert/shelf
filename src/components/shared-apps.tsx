"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Dialog } from "@base-ui/react/dialog"
import { Input } from "@base-ui/react/input"
import { Menu } from "@base-ui/react/menu"
import {
  LuDownload,
  LuPencil,
  LuPlus,
  LuTrash2,
  LuEllipsis,
  LuRefreshCw,
  LuExternalLink,
} from "react-icons/lu"
import { AppBoardDialog } from "@/components/app-board-dialog"
import { AppFormDialog } from "@/components/app-form-dialog"
import { HomarrImportDialog } from "@/components/homarr-import-dialog"
import { ConfirmContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"
import { iconKey } from "@/lib/app-icon"

type App = {
  id: string
  name: string
  description: string
  url: string
  iconSource: string
  iconSlug: string | null
  customIconUrl: string | null
  iconHash: string | null
  status: string
  lastError: string | null
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

function appStatusColor(status: string) {
  if (status === "up") return "bg-green-600 dark:bg-green-400"
  if (status === "down") return "bg-danger"
  return "bg-muted"
}

function appStatusText(app: App) {
  if (app.status === "up") return "Responding"
  if (app.status === "down")
    return app.lastError
      ? `Not responding — ${app.lastError}`
      : "Not responding"
  return "Not checked yet"
}

export function appCheckActionLabel(appName: string) {
  return `Check ${appName} now`
}

export function SharedApps({ initialApps }: { initialApps: App[] }) {
  const utils = trpc.useUtils()
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, {
    initialData: initialApps,
  })
  const { data: boards = [] } = trpc.boards.list.useQuery()
  const [editing, setEditing] = useState<App | null | undefined>(undefined)
  const [importing, setImporting] = useState(false)
  const [importedCount, setImportedCount] = useState<number | null>(null)
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")
  const [checkErrors, setCheckErrors] = useState<Record<string, string>>({})
  const [checkingIds, setCheckingIds] = useState<Record<string, boolean>>({})
  const recheck = trpc.apps.recheckStatus.useMutation({
    onSuccess: (_result, variables) => {
      setCheckErrors((current) => ({ ...current, [variables.id]: "" }))
      setCheckingIds((current) => ({ ...current, [variables.id]: false }))
      void utils.apps.list.invalidate()
    },
    onError: (cause, variables) => {
      setCheckErrors((current) => ({
        ...current,
        [variables.id]: cause.message,
      }))
      setCheckingIds((current) => ({ ...current, [variables.id]: false }))
    },
  })
  const remove = trpc.apps.delete.useMutation({
    onSuccess: () => {
      setError("")
      void utils.apps.list.invalidate()
    },
    onError: (cause) => setError(cause.message),
  })
  const assign = trpc.boards.assign.useMutation({
    onSuccess: () => {
      setError("")
      void utils.boards.list.invalidate()
    },
    onError: (cause) => setError(cause.message),
  })

  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? apps.filter((app) =>
        `${app.name} ${app.description} ${app.url}`
          .toLowerCase()
          .includes(needle),
      )
    : apps

  return (
    <section>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">
          Apps are available to everyone in your household.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <HomarrImportDialog
            open={importing}
            onOpenChange={setImporting}
            onImported={(count) => setImportedCount(count)}
            trigger={
              <Dialog.Trigger className="btn">
                <LuDownload aria-hidden className="size-4" />
                Import from Homarr
              </Dialog.Trigger>
            }
          />
          <AppFormDialog
            open={editing !== undefined}
            app={editing ?? null}
            onOpenChange={(open) => setEditing(open ? null : undefined)}
            trigger={
              <Dialog.Trigger className="btn btn-primary">
                <LuPlus aria-hidden className="size-4" />
                Create app
              </Dialog.Trigger>
            }
          />
        </div>
      </div>

      {importedCount !== null && (
        <p role="status" className="mt-4 border border-line p-3 text-sm">
          Imported {importedCount} app{importedCount === 1 ? "" : "s"} from
          Homarr.
        </p>
      )}

      {apps.length > 0 && (
        <div className="mt-4">
          <label htmlFor="app-filter" className="sr-only">
            Filter apps
          </label>
          <Input
            id="app-filter"
            type="search"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Filter apps…"
            className="field"
          />
        </div>
      )}

      {error && (
        <p
          role="alert"
          className="mt-4 border border-danger p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      {Object.entries(checkErrors).filter(([, message]) => message).length >
        0 && (
        <div
          role="alert"
          className="mt-4 border border-danger p-3 text-sm text-danger"
        >
          {Object.entries(checkErrors)
            .filter(([, message]) => message)
            .map(([id, message]) => {
              const app = apps.find((item) => item.id === id)
              return (
                <p key={id}>
                  Could not check {app?.name ?? "app"}: {message}. Try again.
                </p>
              )
            })}
        </div>
      )}
      {apps.length === 0 ? (
        <div className="panel mt-5 border-dashed px-6 py-12 text-center">
          <p className="font-medium">No shared apps yet</p>
          <p className="mt-1 text-sm text-muted">
            Add the household’s first app to get started.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p
          role="status"
          className="panel mt-5 px-6 py-12 text-center text-muted"
        >
          No apps match “{filter}”.
        </p>
      ) : (
        <ul className="mt-5 space-y-2">
          {visible.map((app) => {
            const checking = Boolean(checkingIds[app.id])
            const boardsMissingApp = boards.filter(
              (board) => !board.apps.some((entry) => entry.appId === app.id),
            )
            return (
              <li
                key={app.id}
                className="panel flex min-w-0 items-center gap-3 p-3"
              >
                <div className="relative size-10 shrink-0">
                  <img
                    src={`/icons/${iconKey(app)}`}
                    alt=""
                    className="size-full object-contain"
                  />
                  <span
                    role="img"
                    title={`${appStatusText(app)}${app.lastCheckedAt ? `; last checked ${new Date(app.lastCheckedAt).toISOString()} UTC` : ""}`}
                    aria-label={`${appStatusText(app)}${app.lastCheckedAt ? `; last checked ${new Date(app.lastCheckedAt).toISOString()} UTC` : ""}${checking ? "; Checking" : ""}`}
                    className={`absolute -right-0.5 -top-0.5 size-3 rounded-full border-2 border-[var(--color-background)] ${appStatusColor(app.status)} ${checking ? "animate-pulse" : ""}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{app.name}</h3>
                  {app.description && (
                    <p className="truncate text-sm text-muted">
                      {app.description}
                    </p>
                  )}
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 items-center text-xs text-muted underline underline-offset-2"
                  >
                    <span className="truncate">{app.url}</span>
                    <LuExternalLink
                      aria-hidden
                      className="ml-1 size-3 shrink-0"
                    />
                  </a>
                </div>
                <Menu.Root>
                  <Menu.Trigger
                    className="btn size-9 shrink-0 p-0"
                    aria-label={`Actions for ${app.name}`}
                    title={`Actions for ${app.name}`}
                  >
                    <LuEllipsis aria-hidden className="size-5" />
                  </Menu.Trigger>
                  <Menu.Portal keepMounted>
                    <Menu.Positioner
                      align="end"
                      sideOffset={4}
                      className="z-50"
                    >
                      <Menu.Popup className="panel min-w-44 p-1 shadow-lg">
                        <Menu.Item
                          closeOnClick={false}
                          disabled={checking}
                          aria-label={appCheckActionLabel(app.name)}
                          onClick={() => {
                            setCheckErrors((current) => ({
                              ...current,
                              [app.id]: "",
                            }))
                            setCheckingIds((current) => ({
                              ...current,
                              [app.id]: true,
                            }))
                            recheck.mutate({ id: app.id })
                          }}
                          className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt focus:bg-surface-alt disabled:opacity-50"
                        >
                          <LuRefreshCw aria-hidden className="size-4" />
                          {checking ? "Checking…" : "Check now"}
                        </Menu.Item>
                        <AppBoardDialog
                          appName={app.name}
                          boards={boardsMissingApp}
                          triggerRender={
                            <Menu.Item className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt focus:bg-surface-alt" />
                          }
                          triggerClassName="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-alt focus:bg-surface-alt"
                          onAssign={(boardId, categoryId) =>
                            assign.mutate({
                              boardId,
                              appId: app.id,
                              categoryId,
                            })
                          }
                        />
                        <Menu.Item
                          onClick={() => setEditing(app)}
                          className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-surface-alt focus:bg-surface-alt"
                        >
                          <LuPencil aria-hidden className="size-4" />
                          Edit
                        </Menu.Item>
                        <AlertDialog.Root>
                          <AlertDialog.Trigger
                            nativeButton={false}
                            render={
                              <Menu.Item className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-surface-alt focus:bg-surface-alt" />
                            }
                          >
                            <LuTrash2 aria-hidden className="size-4" />
                            Delete
                          </AlertDialog.Trigger>
                          <ConfirmContent
                            title="Delete app"
                            description={`Delete ${app.name} from the shared app library? It will be removed from every board.`}
                          >
                            <AlertDialog.Close className="btn">
                              Cancel
                            </AlertDialog.Close>
                            <AlertDialog.Close
                              className="btn btn-danger"
                              onClick={() => remove.mutate({ id: app.id })}
                            >
                              <LuTrash2 aria-hidden className="size-4" />
                              Delete
                            </AlertDialog.Close>
                          </ConfirmContent>
                        </AlertDialog.Root>
                      </Menu.Popup>
                    </Menu.Positioner>
                  </Menu.Portal>
                </Menu.Root>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
