"use client"

import { useId, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Input } from "@base-ui/react/input"
import { LuPlus } from "react-icons/lu"
import { CategorySelect } from "@/components/category-select"
import { ModalContent } from "@/components/modal"
import { iconKey } from "@/lib/app-icon"

type App = {
  id: string
  name: string
  url: string
  iconSource: string
  iconSlug: string | null
  iconHash: string | null
}
type Category = { id: string; title: string }

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

export function BoardAppDialog({
  boardName,
  apps,
  categories,
  lockedCategoryId,
  triggerAriaLabel,
  triggerClassName = "btn text-xs",
  onAssign,
}: {
  boardName: string
  apps: App[]
  categories: Category[]
  lockedCategoryId?: string | null
  triggerAriaLabel?: string
  triggerClassName?: string
  onAssign: (appId: string, categoryId: string | null) => void
}) {
  const locked = lockedCategoryId !== undefined
  const [filter, setFilter] = useState("")
  const [categoryId, setCategoryId] = useState(lockedCategoryId ?? "")
  const filterId = useId()
  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? apps.filter((app) =>
        `${app.name} ${app.url}`.toLowerCase().includes(needle),
      )
    : apps

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          setFilter("")
          setCategoryId(lockedCategoryId ?? "")
        }
      }}
    >
      <Dialog.Trigger
        className={triggerClassName}
        aria-label={triggerAriaLabel}
      >
        <LuPlus aria-hidden className="size-4" />
        Add app
      </Dialog.Trigger>
      <ModalContent
        title="Add app"
        description={`Choose an app to add to “${boardName}”.`}
      >
        {apps.length === 0 ? (
          <p className="text-sm text-muted">
            Every app in the library is already on this board.
          </p>
        ) : (
          <>
            {categories.length > 0 && (
              <div className="mb-3 space-y-1">
                <span className="block text-xs text-muted">Category</span>
                <CategorySelect
                  value={categoryId || null}
                  categories={categories}
                  label="Category"
                  className="w-full"
                  disabled={locked}
                  onChange={(next) => setCategoryId(next ?? "")}
                />
              </div>
            )}
            <label htmlFor={filterId} className="sr-only">
              Filter apps
            </label>
            <Input
              id={filterId}
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter apps…"
              className="field"
            />
            {visible.length === 0 ? (
              <p role="status" className="mt-3 text-sm text-muted">
                No apps match “{filter}”.
              </p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {visible.map((app) => (
                  <li key={app.id}>
                    <Dialog.Close
                      onClick={() => onAssign(app.id, categoryId || null)}
                      className="flex w-full items-center gap-3 border border-line bg-background p-2 text-left hover:border-accent hover:bg-surface-alt"
                    >
                      <img
                        src={`/icons/${iconKey(app)}`}
                        alt=""
                        className="h-9 w-9 shrink-0 object-contain p-1"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {app.name}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {hostname(app.url)}
                        </span>
                      </span>
                      <LuPlus
                        aria-hidden
                        className="size-4 shrink-0 text-muted"
                      />
                    </Dialog.Close>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </ModalContent>
    </Dialog.Root>
  )
}
