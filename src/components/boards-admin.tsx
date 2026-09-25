"use client"

import { useState, type ReactNode } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  LuArrowDown,
  LuArrowUp,
  LuExternalLink,
  LuInfo,
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
import { CategorySelect } from "@/components/category-select"
import { ConfirmContent, ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"
import { iconKey } from "@/lib/app-icon"

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

function boardGroups(board: Board) {
  return [
    { category: null, apps: board.apps.filter((entry) => !entry.categoryId) },
    ...board.categories.map((category) => ({
      category,
      apps: board.apps.filter((entry) => entry.categoryId === category.id),
    })),
  ]
}

function IconAction({
  label,
  tooltip,
  onClick,
  disabled,
  danger,
  children,
}: {
  label: string
  tooltip: string
  onClick: () => void
  disabled?: boolean
  danger?: boolean
  children: ReactNode
}) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger
        render={
          <button
            type="button"
            className={`btn text-xs ${danger ? "btn-danger" : ""}`}
            disabled={disabled}
            onClick={onClick}
            aria-label={label}
          />
        }
      >
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={6}>
          <Tooltip.Popup className="panel px-2 py-1 text-xs">
            {tooltip}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
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
    return (
      <li
        key={entry.appId}
        className="flex flex-col gap-2 rounded-[2px] px-3 py-2 hover:bg-surface-alt sm:flex-row sm:flex-wrap sm:items-center"
      >
        <div className="flex min-w-0 items-center gap-2 sm:flex-1">
          <img
            src={`/icons/${iconKey(entry.app)}`}
            alt=""
            className="h-9 w-9 shrink-0 object-contain p-1"
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{entry.app.name}</span>
            <a
              href={entry.app.url}
              target="_blank"
              rel="noreferrer"
              className="flex min-w-0 items-center text-xs text-muted underline underline-offset-2"
            >
              <span className="truncate">{entry.app.url}</span>
              <LuExternalLink aria-hidden className="ml-1 size-3 shrink-0" />
            </a>
          </span>
        </div>
        {board.categories.length > 0 && (
          <CategorySelect
            value={entry.categoryId}
            categories={board.categories}
            label={`Category for ${entry.app.name}`}
            className="w-full sm:w-auto"
            onChange={(categoryId) =>
              setAssignmentCategory.mutate({
                boardId: board.id,
                appId: entry.appId,
                categoryId,
              })
            }
          />
        )}
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-1">
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
          </div>
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
        </div>
      </li>
    )
  }

  function renderCategoryControls(
    board: Board,
    category: Category,
    index: number,
  ) {
    const available = apps.filter(
      (app) => !board.apps.some((entry) => entry.appId === app.id),
    )
    return (
      <div className="flex shrink-0 gap-1">
        <BoardAppDialog
          boardName={board.name}
          apps={available}
          categories={board.categories}
          lockedCategoryId={category.id}
          triggerAriaLabel={`Add app to ${category.title}`}
          onAssign={(appId, categoryId) =>
            assign.mutate({ boardId: board.id, appId, categoryId })
          }
        />
        <IconAction
          label={`Edit category ${category.title}`}
          tooltip="Edit"
          onClick={() => setCategoryDraft({ mode: "edit", category })}
        >
          <LuPencil aria-hidden className="size-4" />
        </IconAction>
        <IconAction
          label={`Move category ${category.title} up`}
          tooltip="Move up"
          disabled={index === 0}
          onClick={() =>
            moveCategory.mutate({
              boardId: board.id,
              id: category.id,
              direction: "up",
            })
          }
        >
          <LuArrowUp aria-hidden className="size-4" />
        </IconAction>
        <IconAction
          label={`Move category ${category.title} down`}
          tooltip="Move down"
          disabled={index === board.categories.length - 1}
          onClick={() =>
            moveCategory.mutate({
              boardId: board.id,
              id: category.id,
              direction: "down",
            })
          }
        >
          <LuArrowDown aria-hidden className="size-4" />
        </IconAction>
        <AlertDialog.Root>
          <AlertDialog.Trigger
            className="btn btn-danger text-xs"
            aria-label={`Delete category ${category.title}`}
          >
            <LuTrash2 aria-hidden className="size-4" />
          </AlertDialog.Trigger>
          <ConfirmContent
            title="Delete category"
            description={`Delete “${category.title}”? Its apps move to the end of the uncategorized group.`}
          >
            <AlertDialog.Close className="btn">Cancel</AlertDialog.Close>
            <AlertDialog.Close
              className="btn btn-danger"
              onClick={() => deleteCategory.mutate({ id: category.id })}
            >
              <LuTrash2 aria-hidden className="size-4" />
              Delete
            </AlertDialog.Close>
          </ConfirmContent>
        </AlertDialog.Root>
      </div>
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
              Create board
            </Dialog.Trigger>
            <ModalContent
              title="Create board"
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
                Create app
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
                      className="flex max-w-full items-center text-xs text-muted underline underline-offset-2"
                      href={`/board/${board.nanoid}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <span className="truncate">/board/{board.nanoid}</span>
                      <LuExternalLink
                        aria-hidden
                        className="ml-1 size-3 shrink-0"
                      />
                    </a>
                  </div>
                  <div className="flex flex-wrap gap-2">
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

                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                  <h4 className="text-xs font-semibold text-muted uppercase">
                    Apps
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

                <div className="mt-3 space-y-6">
                  {groups.map((group) => {
                    const category = group.category
                    const categoryIndex = category
                      ? board.categories.findIndex(
                          (item) => item.id === category.id,
                        )
                      : -1
                    return (
                      <section
                        key={category?.id ?? "uncategorized"}
                        aria-label={category?.title ?? "Uncategorised"}
                      >
                        <header className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] bg-surface-alt px-3 py-2">
                          <div className="flex min-w-0 items-center gap-1">
                            <h5 className="truncate text-sm font-semibold">
                              {category?.title ?? "Uncategorised"}
                            </h5>
                            {!category && (
                              <Popover.Root>
                                <Popover.Trigger
                                  aria-label="About Uncategorised"
                                  className="inline-flex size-6 shrink-0 items-center justify-center text-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-focus"
                                >
                                  <LuInfo aria-hidden className="size-4" />
                                </Popover.Trigger>
                                <Popover.Portal>
                                  <Popover.Positioner
                                    side="top"
                                    align="start"
                                    sideOffset={8}
                                    collisionPadding={8}
                                    className="z-50"
                                  >
                                    <Popover.Popup
                                      className="panel pointer-events-none w-fit max-w-[min(20rem,calc(100vw-2rem))] p-3 text-xs shadow-lg outline-none"
                                      aria-label="Uncategorised information"
                                    >
                                      Apps here appear first on the public board
                                      without a category.
                                    </Popover.Popup>
                                  </Popover.Positioner>
                                </Popover.Portal>
                              </Popover.Root>
                            )}
                            {category?.description && (
                              <p className="text-xs text-muted">
                                {category.description}
                              </p>
                            )}
                          </div>
                          {category ? (
                            renderCategoryControls(
                              board,
                              category,
                              categoryIndex,
                            )
                          ) : (
                            <BoardAppDialog
                              boardName={board.name}
                              apps={available}
                              categories={board.categories}
                              lockedCategoryId={null}
                              triggerAriaLabel="Add app to Uncategorised"
                              triggerClassName="btn text-xs"
                              onAssign={(appId, categoryId) =>
                                assign.mutate({
                                  boardId: board.id,
                                  appId,
                                  categoryId,
                                })
                              }
                            />
                          )}
                        </header>
                        <div className="pt-1">
                          {group.apps.length === 0 ? (
                            <p className="px-3 py-2 text-sm text-muted">
                              No apps assigned.
                            </p>
                          ) : (
                            <ol className="space-y-1">
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
                        </div>
                      </section>
                    )
                  })}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
