"use client"

import { useState } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  LuArrowDown,
  LuArrowUp,
  LuExternalLink,
  LuPencil,
  LuPlus,
  LuStar,
  LuTrash2,
  LuX,
} from "react-icons/lu"
import { AppFormDialog } from "@/components/app-form-dialog"
import {
  BoardCategoryDialog,
  type CategoryRecord,
} from "@/components/board-category-dialog"
import { BoardAppDialog } from "@/components/board-app-dialog"
import { ConfirmContent, ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

type Category = CategoryRecord & {
  boardId: string
  position: number
  createdAt: string
  updatedAt: string
}
type BoardAppEntry = {
  boardId: string
  appId: string
  categoryId: string | null
  position: number
  app: App
}
type Board = {
  id: string
  name: string
  nanoid: string
  ownerId: string
  createdAt: string
  updatedAt: string
  categories: Category[]
  apps: BoardAppEntry[]
}
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

function hostname(url: string) {
  try {
    return new URL(url).hostname
  } catch {
    return url
  }
}

function boardGroups(board: Board) {
  return [
    { category: null, apps: board.apps.filter((entry) => !entry.categoryId) },
    ...board.categories.map((category) => ({
      category,
      apps: board.apps.filter((entry) => entry.categoryId === category.id),
    })),
  ]
}

export function BoardsAdmin({
  initialBoards,
  initialApps,
  initialDefaultBoardId = null,
}: {
  initialBoards: Board[]
  initialApps: App[]
  initialDefaultBoardId?: string | null
}) {
  const utils = trpc.useUtils()
  const { data: boards = initialBoards } = trpc.boards.list.useQuery(
    undefined,
    { initialData: initialBoards },
  )
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, {
    initialData: initialApps,
  })
  const [name, setName] = useState("")
  const [defaultId, setDefaultId] = useState<string | null>(
    initialDefaultBoardId,
  )
  const [addOpen, setAddOpen] = useState(false)
  const [addAppOpen, setAddAppOpen] = useState(false)
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [categoryDraft, setCategoryDraft] = useState<
    | { mode: "create"; boardId: string }
    | { mode: "edit"; category: Category }
    | null
  >(null)
  const [editingApp, setEditingApp] = useState<App | null>(null)
  const [error, setError] = useState("")
  const refresh = () => {
    setError("")
    void utils.boards.list.invalidate()
  }
  const fail = (cause: { message: string }) => setError(cause.message)
  const create = trpc.boards.create.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const rename = trpc.boards.rename.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const remove = trpc.boards.delete.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const setDefault = trpc.boards.setDefault.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const assign = trpc.boards.assign.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const unassign = trpc.boards.unassign.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const move = trpc.boards.move.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const setAssignmentCategory = trpc.boards.setAssignmentCategory.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const createCategory = trpc.boards.createCategory.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const updateCategory = trpc.boards.updateCategory.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const moveCategory = trpc.boards.moveCategory.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const deleteCategory = trpc.boards.deleteCategory.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const categoryPending = createCategory.isPending || updateCategory.isPending

  function saveCategory(values: { title: string; description: string }) {
    if (!categoryDraft) return
    if (categoryDraft.mode === "create")
      createCategory.mutate(
        { boardId: categoryDraft.boardId, ...values },
        { onSuccess: () => setCategoryDraft(null) },
      )
    else
      updateCategory.mutate(
        { id: categoryDraft.category.id, ...values },
        { onSuccess: () => setCategoryDraft(null) },
      )
  }

  function renderAssignment(
    board: Board,
    entry: BoardAppEntry,
    index: number,
    groupCount: number,
  ) {
    const selectId = `category-${board.id}-${entry.appId}`
    return (
      <li
        key={entry.appId}
        className="flex flex-wrap items-center gap-2 border border-line bg-background p-2"
      >
        <img
          src={`/icons/${entry.app.iconSlug}`}
          alt=""
          className="h-9 w-9 shrink-0 border border-line bg-surface object-contain p-1"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium">{entry.app.name}</span>
          <span className="block truncate text-xs text-muted">
            {hostname(entry.app.url)}
          </span>
        </span>
        <label htmlFor={selectId} className="sr-only">
          Category for {entry.app.name}
        </label>
        {board.categories.length > 0 && (
          <select
            id={selectId}
            className="field w-auto"
            value={entry.categoryId ?? ""}
            onChange={(event) =>
              setAssignmentCategory.mutate({
                boardId: board.id,
                appId: entry.appId,
                categoryId: event.target.value || null,
              })
            }
          >
            <option value="">Uncategorized</option>
            {board.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.title}
              </option>
            ))}
          </select>
        )}
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className="btn text-xs"
                onClick={() => setEditingApp(entry.app)}
                aria-label={`Edit ${entry.app.name}`}
              />
            }
          >
            <LuPencil aria-hidden className="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="panel px-2 py-1 text-xs">
                Edit
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className="btn text-xs"
                disabled={index === 0}
                onClick={() =>
                  move.mutate({
                    boardId: board.id,
                    appId: entry.appId,
                    direction: "up",
                  })
                }
                aria-label={`Move ${entry.app.name} up`}
              />
            }
          >
            <LuArrowUp aria-hidden className="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="panel px-2 py-1 text-xs">
                Move up
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <button
                type="button"
                className="btn text-xs"
                disabled={index === groupCount - 1}
                onClick={() =>
                  move.mutate({
                    boardId: board.id,
                    appId: entry.appId,
                    direction: "down",
                  })
                }
                aria-label={`Move ${entry.app.name} down`}
              />
            }
          >
            <LuArrowDown aria-hidden className="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="panel px-2 py-1 text-xs">
                Move down
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
        <Button
          className="btn btn-danger text-xs"
          onClick={() =>
            unassign.mutate({
              boardId: board.id,
              appId: entry.appId,
            })
          }
        >
          <LuX aria-hidden className="size-4" />
          Remove
        </Button>
      </li>
    )
  }

  return (
    <section>
      {error && (
        <p
          role="alert"
          className="mb-4 border border-danger bg-surface p-3 text-sm text-danger"
        >
          {error}. Your changes were not saved; please retry.
        </p>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-muted">
          Boards belong to you and are reachable by anyone with the link.
        </p>
        <div className="flex flex-wrap gap-2">
          <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
            <Dialog.Trigger className="btn btn-primary">
              <LuPlus aria-hidden className="size-4" />
              Add board
            </Dialog.Trigger>
            <ModalContent
              title="Add board"
              description="Boards are reachable by anyone with the public link."
            >
              <Form
                onFormSubmit={(values) =>
                  create.mutate(
                    { name: String(values.name ?? "") },
                    {
                      onSuccess: (created) => {
                        setName("")
                        setAddOpen(false)
                        if (!defaultId) setDefaultId(created.id)
                      },
                    },
                  )
                }
              >
                <Field.Root name="name" className="space-y-2">
                  <Field.Label className="text-xs text-muted">
                    Board name
                  </Field.Label>
                  <Input
                    className="field"
                    required
                    maxLength={80}
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="New board name"
                  />
                  <Field.Error className="text-xs text-danger" />
                </Field.Root>
                <div className="mt-4 flex justify-end gap-2">
                  <Dialog.Close className="btn">Cancel</Dialog.Close>
                  <Button type="submit" className="btn btn-primary">
                    <LuPlus aria-hidden className="size-4" />
                    Create board
                  </Button>
                </div>
              </Form>
            </ModalContent>
          </Dialog.Root>
          <AppFormDialog
            open={addAppOpen}
            onOpenChange={setAddAppOpen}
            app={null}
            trigger={
              <Dialog.Trigger className="btn">
                <LuPlus aria-hidden className="size-4" />
                Add app
              </Dialog.Trigger>
            }
          />
        </div>
      </div>
      <Dialog.Root
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
      >
        <ModalContent title="Rename board">
          <Form
            onFormSubmit={(values) => {
              if (renaming)
                rename.mutate(
                  { id: renaming.id, name: String(values.name ?? "") },
                  { onSuccess: () => setRenaming(null) },
                )
            }}
          >
            <Field.Root name="name" className="space-y-2">
              <Field.Label className="text-xs text-muted">
                Board name
              </Field.Label>
              <Input
                key={renaming?.id}
                className="field"
                required
                maxLength={80}
                defaultValue={renaming?.name ?? ""}
              />
              <Field.Error className="text-xs text-danger" />
            </Field.Root>
            <div className="mt-4 flex justify-end gap-2">
              <Dialog.Close className="btn">Cancel</Dialog.Close>
              <Button type="submit" className="btn btn-primary">
                <LuPencil aria-hidden className="size-4" />
                Save
              </Button>
            </div>
          </Form>
        </ModalContent>
      </Dialog.Root>
      <BoardCategoryDialog
        open={categoryDraft !== null}
        onOpenChange={(open) => {
          if (!open) setCategoryDraft(null)
        }}
        category={
          categoryDraft?.mode === "edit" ? categoryDraft.category : null
        }
        pending={categoryPending}
        onSave={saveCategory}
      />
      <AppFormDialog
        open={editingApp !== null}
        app={editingApp}
        onOpenChange={(open) => {
          if (!open) setEditingApp(null)
        }}
        onSaved={() => void utils.boards.list.invalidate()}
      />
      {boards.length === 0 ? (
        <p className="panel mt-4 border-dashed p-8 text-center text-muted">
          Create your first board to start sharing apps.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {boards.map((board) => {
            const available = apps.filter(
              (app) => !board.apps.some((entry) => entry.appId === app.id),
            )
            const groups = boardGroups(board)
            return (
              <li key={board.id} className="panel p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold">{board.name}</h3>
                    <a
                      className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2"
                      href={`/board/${board.nanoid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <LuExternalLink aria-hidden className="size-3.5" />
                      {`/board/${board.nanoid}`}
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <BoardAppDialog
                      boardName={board.name}
                      apps={available}
                      categories={board.categories}
                      onAssign={(appId, categoryId) =>
                        assign.mutate({ boardId: board.id, appId, categoryId })
                      }
                    />
                    <Button
                      className="btn text-xs"
                      onClick={() =>
                        setRenaming({ id: board.id, name: board.name })
                      }
                    >
                      <LuPencil aria-hidden className="size-4" />
                      Rename
                    </Button>
                    <Button
                      className={`btn text-xs ${board.id === defaultId ? "text-accent disabled:opacity-100" : ""}`}
                      disabled={board.id === defaultId}
                      onClick={() =>
                        setDefault.mutate(
                          { id: board.id },
                          { onSuccess: () => setDefaultId(board.id) },
                        )
                      }
                    >
                      <LuStar
                        aria-hidden
                        className={`size-4 ${board.id === defaultId ? "fill-current" : ""}`}
                      />
                      {board.id === defaultId ? "Default" : "Set as default"}
                    </Button>
                    <AlertDialog.Root>
                      <AlertDialog.Trigger className="btn btn-danger text-xs">
                        <LuTrash2 aria-hidden className="size-4" />
                        Delete
                      </AlertDialog.Trigger>
                      <ConfirmContent
                        title="Delete board"
                        description={`Delete “${board.name}”? This removes the board, its categories, and its assignments.`}
                      >
                        <AlertDialog.Close className="btn">
                          Cancel
                        </AlertDialog.Close>
                        <AlertDialog.Close
                          className="btn btn-danger"
                          onClick={() =>
                            remove.mutate(
                              { id: board.id },
                              {
                                onSuccess: () => {
                                  if (defaultId === board.id) {
                                    const next = boards.find(
                                      (item) => item.id !== board.id,
                                    )
                                    setDefaultId(next?.id ?? null)
                                  }
                                },
                              },
                            )
                          }
                        >
                          <LuTrash2 aria-hidden className="size-4" />
                          Delete
                        </AlertDialog.Close>
                      </ConfirmContent>
                    </AlertDialog.Root>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-muted uppercase">
                    Categories
                  </h4>
                  <Button
                    className="btn text-xs"
                    onClick={() =>
                      setCategoryDraft({ mode: "create", boardId: board.id })
                    }
                  >
                    <LuPlus aria-hidden className="size-4" />
                    Add category
                  </Button>
                </div>
                {board.categories.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">
                    No categories yet. Apps are shown uncategorized.
                  </p>
                ) : (
                  <ol className="mt-2 space-y-2">
                    {board.categories.map((category, index) => (
                      <li
                        key={category.id}
                        className="flex flex-wrap items-center gap-2 border border-line bg-background p-2"
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">
                            {category.title}
                          </span>
                          {category.description && (
                            <span className="block truncate text-xs text-muted">
                              {category.description}
                            </span>
                          )}
                        </span>
                        <Button
                          className="btn text-xs"
                          onClick={() =>
                            setCategoryDraft({ mode: "edit", category })
                          }
                          aria-label={`Edit category ${category.title}`}
                        >
                          <LuPencil aria-hidden className="size-4" />
                          Edit
                        </Button>
                        <Button
                          className="btn text-xs"
                          disabled={index === 0}
                          onClick={() =>
                            moveCategory.mutate({
                              boardId: board.id,
                              id: category.id,
                              direction: "up",
                            })
                          }
                          aria-label={`Move category ${category.title} up`}
                        >
                          <LuArrowUp aria-hidden className="size-4" />
                          Move up
                        </Button>
                        <Button
                          className="btn text-xs"
                          disabled={index === board.categories.length - 1}
                          onClick={() =>
                            moveCategory.mutate({
                              boardId: board.id,
                              id: category.id,
                              direction: "down",
                            })
                          }
                          aria-label={`Move category ${category.title} down`}
                        >
                          <LuArrowDown aria-hidden className="size-4" />
                          Move down
                        </Button>
                        <AlertDialog.Root>
                          <AlertDialog.Trigger className="btn btn-danger text-xs">
                            <LuTrash2 aria-hidden className="size-4" />
                            Delete
                          </AlertDialog.Trigger>
                          <ConfirmContent
                            title="Delete category"
                            description={`Delete “${category.title}”? Its apps move to the end of the uncategorized group.`}
                          >
                            <AlertDialog.Close className="btn">
                              Cancel
                            </AlertDialog.Close>
                            <AlertDialog.Close
                              className="btn btn-danger"
                              onClick={() =>
                                deleteCategory.mutate({ id: category.id })
                              }
                            >
                              <LuTrash2 aria-hidden className="size-4" />
                              Delete
                            </AlertDialog.Close>
                          </ConfirmContent>
                        </AlertDialog.Root>
                      </li>
                    ))}
                  </ol>
                )}

                {board.apps.length === 0 && board.categories.length === 0 ? (
                  <p className="mt-4 text-sm text-muted">
                    No apps assigned yet.
                  </p>
                ) : board.categories.length === 0 ? (
                  <ol className="mt-4 space-y-2">
                    {board.apps.map((entry, index) =>
                      renderAssignment(board, entry, index, board.apps.length),
                    )}
                  </ol>
                ) : (
                  <div className="mt-4 space-y-4">
                    {groups.map((group) => (
                      <section key={group.category?.id ?? "uncategorized"}>
                        <h5 className="mb-2 text-sm font-semibold">
                          {group.category?.title ?? "Uncategorized"}
                        </h5>
                        {group.apps.length === 0 ? (
                          <p className="text-sm text-muted">
                            No apps assigned.
                          </p>
                        ) : (
                          <ol className="space-y-2">
                            {group.apps.map((entry, index) =>
                              renderAssignment(
                                board,
                                entry,
                                index,
                                group.apps.length,
                              ),
                            )}
                          </ol>
                        )}
                      </section>
                    ))}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
