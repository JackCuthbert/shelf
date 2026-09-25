"use client"

import { useId, useState } from "react"
import type { ReactElement } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Input } from "@base-ui/react/input"
import { LuPlus } from "react-icons/lu"
import { CategorySelect } from "@/components/category-select"
import { ModalContent } from "@/components/modal"

type Board = {
  id: string
  name: string
  categories: { id: string; title: string }[]
}

export function AppBoardDialog({
  appName,
  boards,
  onAssign,
  triggerClassName = "btn text-xs",
  triggerRender,
}: {
  appName: string
  boards: Board[]
  onAssign: (boardId: string, categoryId: string | null) => void
  triggerClassName?: string
  triggerRender?: ReactElement
}) {
  const [filter, setFilter] = useState("")
  const [categoryByBoard, setCategoryByBoard] = useState<
    Record<string, string>
  >({})
  const filterId = useId()
  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? boards.filter((board) => board.name.toLowerCase().includes(needle))
    : boards

  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) {
          setFilter("")
          setCategoryByBoard({})
        }
      }}
    >
      <Dialog.Trigger
        render={triggerRender}
        className={triggerClassName}
        aria-label={`Add ${appName} to a board`}
      >
        <LuPlus aria-hidden className="size-4" />
        Add to board
      </Dialog.Trigger>
      <ModalContent
        title="Add to board"
        description={`Choose a board for “${appName}”.`}
      >
        {boards.length === 0 ? (
          <p className="text-sm text-muted">
            This app is already on every board.
          </p>
        ) : (
          <>
            <label htmlFor={filterId} className="sr-only">
              Filter boards
            </label>
            <Input
              id={filterId}
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              placeholder="Filter boards…"
              className="field"
            />
            {visible.length === 0 ? (
              <p role="status" className="mt-3 text-sm text-muted">
                No boards match “{filter}”.
              </p>
            ) : (
              <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                {visible.map((board) => (
                  <li
                    key={board.id}
                    className="flex flex-wrap items-center gap-2 border border-line bg-background p-2"
                  >
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {board.name}
                    </span>
                    {board.categories.length > 0 && (
                      <CategorySelect
                        value={categoryByBoard[board.id] || null}
                        categories={board.categories}
                        label={`Category on ${board.name}`}
                        onChange={(categoryId) =>
                          setCategoryByBoard((previous) => ({
                            ...previous,
                            [board.id]: categoryId ?? "",
                          }))
                        }
                      />
                    )}
                    <Dialog.Close
                      className="btn btn-primary text-xs"
                      onClick={() =>
                        onAssign(board.id, categoryByBoard[board.id] || null)
                      }
                    >
                      <LuPlus aria-hidden className="size-4" />
                      Add
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
