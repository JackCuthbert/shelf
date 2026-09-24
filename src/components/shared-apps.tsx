"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Input } from "@base-ui/react/input"
import { LuPencil, LuPlus, LuTrash2 } from "react-icons/lu"
import { AppFormDialog } from "@/components/app-form-dialog"
import { ConfirmContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

type App = {
  id: string
  name: string
  description: string
  url: string
  iconSlug: string
  status: string
  lastCheckedAt: string | null
  createdAt: string
  updatedAt: string
}

export function SharedApps({ initialApps }: { initialApps: App[] }) {
  const utils = trpc.useUtils()
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, {
    initialData: initialApps,
  })
  const [editing, setEditing] = useState<App | null | undefined>(undefined)
  const [filter, setFilter] = useState("")
  const [error, setError] = useState("")
  const remove = trpc.apps.delete.useMutation({
    onSuccess: () => {
      setError("")
      void utils.apps.list.invalidate()
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
          {visible.map((app) => (
            <li
              key={app.id}
              className="panel flex min-w-0 items-center gap-3 p-3"
            >
              <img
                src={`/icons/${app.iconSlug}`}
                alt=""
                className="h-12 w-12 shrink-0 border border-line bg-background object-contain p-1"
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
              </div>
              <div className="flex shrink-0 gap-1">
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
          ))}
        </ul>
      )}
    </section>
  )
}
