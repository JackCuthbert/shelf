"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Input } from "@base-ui/react/input"
import { LuDownload, LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { AppBoardDialog } from "@/components/app-board-dialog"
import { AppFormDialog } from "@/components/app-form-dialog"
import { HomarrImportDialog } from "@/components/homarr-import-dialog"
import { ConfirmContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

type App = {
  id: string
  name: string
  description: string
  url: string
  iconSlug: string
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
            const boardsMissingApp = boards.filter(
              (board) => !board.apps.some((entry) => entry.appId === app.id),
            )
            return (
              <li
                key={app.id}
                className="panel flex min-w-0 items-center gap-3 p-3"
              >
                <img
                  src={`/icons/${app.iconSlug}`}
                  alt=""
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-semibold">{app.name}</h3>
                  {app.description && (
                    <p className="line-clamp-2 text-sm text-muted">
                      {app.description}
                    </p>
                  )}
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-sm text-accent underline underline-offset-2"
                  >
                    {app.url}
                  </a>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <span
                      aria-hidden
                      className={`size-2 shrink-0 rounded-full ${appStatusColor(app.status)}`}
                    />
                    <span>{appStatusText(app)}</span>
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <AppBoardDialog
                    appName={app.name}
                    boards={boardsMissingApp}
                    onAssign={(boardId, categoryId) =>
                      assign.mutate({ boardId, appId: app.id, categoryId })
                    }
                  />
                  <Button
                    className="btn text-xs"
                    onClick={() => setEditing(app)}
                    aria-label={`Edit ${app.name}`}
                  >
                    <LuPencil aria-hidden className="size-4" />
                    Edit
                  </Button>
                  <AlertDialog.Root>
                    <AlertDialog.Trigger
                      className="btn btn-danger text-xs"
                      aria-label={`Delete ${app.name}`}
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
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
