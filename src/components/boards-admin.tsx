"use client"

import { Fragment, useEffect, useState, type ReactNode } from "react"
import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { Popover } from "@base-ui/react/popover"
import { Tooltip } from "@base-ui/react/tooltip"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  LuArrowDown,
  LuArrowUp,
  LuGripVertical,
  LuInfo,
  LuPencil,
  LuPlus,
  LuStar,
  LuTrash2,
  LuX,
  LuExternalLink,
} from "react-icons/lu"
import { AppFormDialog } from "@/components/app-form-dialog"
import {
  BoardCategoryDialog,
  type CategoryRecord,
} from "@/components/board-category-dialog"
import { BoardAppDialog } from "@/components/board-app-dialog"
import { CategorySelect } from "@/components/category-select"
import { ConfirmContent, ModalContent, ModalFooter } from "@/components/modal"
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
  ownerId: string
  createdAt: string
  updatedAt: string
  categories: Category[]
  apps: BoardAppEntry[]
}
type App = {
  id: string
  ownerId: string
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
  probeRequestedAt: string | null
  createdAt: string
  updatedAt: string
}

const boardCollisionDetection: CollisionDetection = (args) => {
  const hits = pointerWithin(args).filter(
    (collision) => collision.id !== args.active.id,
  )
  const groupHit = hits.find(
    (collision) =>
      args.droppableContainers.find(
        (container) => container.id === collision.id,
      )?.data.current?.kind === "group",
  )
  if (!groupHit || !args.pointerCoordinates) return []
  const group = args.droppableContainers.find(
    (container) => container.id === groupHit.id,
  )
  const slots = args.droppableContainers.filter(
    (container) =>
      container.data.current?.kind === "slot" &&
      container.data.current?.boardId === group?.data.current?.boardId &&
      container.data.current?.categoryId === group?.data.current?.categoryId,
  )
  if (slots.length === 0) return []
  const { x, y } = args.pointerCoordinates
  return closestCenter({
    ...args,
    collisionRect: {
      top: y,
      bottom: y,
      left: x,
      right: x,
      width: 0,
      height: 0,
    },
    droppableContainers: slots,
  })
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

function SortableAssignment({
  boardId,
  appId,
  id,
  isDragging,
  children,
}: {
  id: string
  boardId: string
  appId: string
  isDragging: boolean
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id,
    data: { kind: "app", boardId, appId },
  })
  return (
    <li
      ref={setNodeRef}
      className={`list-none ${isDragging ? "opacity-10" : ""}`}
    >
      <div className="flex items-center">
        <button
          type="button"
          className="touch-none cursor-grab px-1 text-muted active:cursor-grabbing"
          aria-label="Drag to reorder app"
          {...attributes}
          {...listeners}
        >
          <LuGripVertical aria-hidden className="size-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </li>
  )
}

function InsertionSlot({
  boardId,
  categoryId,
  index,
  active,
}: {
  boardId: string
  categoryId: string | null
  index: number
  active: boolean
}) {
  const id = `board:${boardId}:category:${categoryId ?? "uncategorized"}:slot:${index}`
  const { setNodeRef } = useDroppable({
    id,
    data: { kind: "slot", boardId, categoryId, index },
  })
  return (
    <div ref={setNodeRef} className="relative z-10 h-1 -mb-1" aria-hidden>
      {active && (
        <div className="absolute inset-x-2 top-1/2 border-t-2 border-accent" />
      )}
    </div>
  )
}

function CategoryDropTarget({
  boardId,
  categoryId,
  label,
  children,
}: {
  boardId: string
  categoryId: string | null
  label: string
  children: ReactNode
}) {
  const { setNodeRef } = useDroppable({
    id: `board:${boardId}:group:${categoryId ?? "uncategorized"}`,
    data: { kind: "group", boardId, categoryId },
  })
  return (
    <section ref={setNodeRef} aria-label={label} className="panel">
      {children}
    </section>
  )
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
  boardNanoid,
}: {
  initialBoards: Board[]
  initialApps: App[]
  initialDefaultBoardId?: string | null
  boardNanoid?: string
}) {
  const { data: boards = initialBoards } = trpc.boards.list.useQuery(
    undefined,
    { initialData: initialBoards },
  )
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, {
    initialData: initialApps,
  })
  const visibleBoards = boardNanoid
    ? boards.filter((board) => board.id === boardNanoid)
    : boards
  const activeBoard = visibleBoards[0]
  const [defaultId, setDefaultId] = useState<string | null>(
    initialDefaultBoardId,
  )
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(
    null,
  )
  const [categoryDraft, setCategoryDraft] = useState<
    | { mode: "create"; boardId: string }
    | { mode: "edit"; category: Category }
    | null
  >(null)
  const [editingApp, setEditingApp] = useState<App | null>(null)
  const [optimisticOrders, setOptimisticOrders] = useState<
    Record<
      string,
      { appIds: string[]; appId: string; categoryId: string | null }
    >
  >({})
  const [error, setError] = useState("")
  const [activeDrag, setActiveDrag] = useState<{
    boardId: string
    appId: string
  } | null>(null)
  const [dropPreview, setDropPreview] = useState<string | null>(null)
  const refresh = () => {
    setError("")
  }
  const fail = (cause: { message: string }) => setError(cause.message)
  const rename = trpc.boards.rename.useMutation({
    onSuccess: refresh,
    onError: fail,
  })
  const deleteBoard = trpc.boards.delete.useMutation({
    onSuccess: () => window.location.assign("/admin/boards"),
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
  const reorder = trpc.boards.reorder.useMutation({
    onSuccess: refresh,
    onError: (cause, variables) => {
      setOptimisticOrders((current) => {
        const next = { ...current }
        delete next[variables.boardId]
        return next
      })
      fail(cause)
    },
  })
  useEffect(() => {
    const matchedBoardIds = Object.entries(optimisticOrders)
      .filter(([boardId, optimistic]) => {
        const board = boards.find((item) => item.id === boardId)
        return (
          board &&
          optimistic.appIds.length === board.apps.length &&
          optimistic.appIds.every(
            (id, index) => board.apps[index]?.appId === id,
          ) &&
          board.apps.find((entry) => entry.appId === optimistic.appId)
            ?.categoryId === optimistic.categoryId
        )
      })
      .map(([boardId]) => boardId)
    if (matchedBoardIds.length === 0) return
    setOptimisticOrders((current) => {
      const next = { ...current }
      for (const boardId of matchedBoardIds) delete next[boardId]
      return next
    })
  }, [boards, optimisticOrders])
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
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  )
  function reorderGroup(board: Board, event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const draggedId = String(active.data.current?.appId ?? "")
    const dragged = board.apps.find((entry) => entry.appId === draggedId)
    if (!dragged) return
    const categoryId = over.data.current?.categoryId as
      | string
      | null
      | undefined
    const slotIndex = over.data.current?.index
    if (
      over.data.current?.kind !== "slot" ||
      typeof slotIndex !== "number" ||
      categoryId === undefined
    )
      return
    const originalGroups = boardGroups(board)
    const nextGroups = originalGroups.map((group) => ({
      categoryId: group.category?.id ?? null,
      appIds: group.apps
        .map((entry) => entry.appId)
        .filter((id) => id !== draggedId),
    }))
    const destination = nextGroups.find(
      (group) => group.categoryId === categoryId,
    )
    if (!destination) return
    const sourceGroup = originalGroups.find((group) =>
      group.apps.some((entry) => entry.appId === draggedId),
    )
    const sourceIndex =
      sourceGroup?.apps.findIndex((entry) => entry.appId === draggedId) ?? -1
    const adjustedIndex =
      categoryId === dragged.categoryId && sourceIndex < slotIndex
        ? slotIndex - 1
        : slotIndex
    destination.appIds.splice(
      Math.max(0, Math.min(adjustedIndex, destination.appIds.length)),
      0,
      draggedId,
    )
    const order = nextGroups.flatMap((group) => group.appIds)
    if (
      order.every((id, index) => id === board.apps[index]?.appId) &&
      categoryId === dragged.categoryId
    )
      return
    setOptimisticOrders((current) => ({
      ...current,
      [board.id]: {
        appIds: order,
        appId: draggedId,
        categoryId,
      },
    }))
    reorder.mutate({
      boardId: board.id,
      appIds: order,
      appId: draggedId,
      categoryId,
    })
  }

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

  function renderAssignment(board: Board, entry: BoardAppEntry) {
    return (
      <div className="flex flex-col gap-2 rounded-[2px] px-3 py-2 hover:bg-surface-alt/50 sm:flex-row sm:flex-wrap sm:items-center">
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
        <div className="flex items-center justify-between gap-1 sm:justify-start">
          <div className="flex items-center gap-1">
            {board.categories.length > 0 && (
              <CategorySelect
                value={entry.categoryId}
                categories={board.categories}
                label={`Category for ${entry.app.name}`}
                iconOnly
                onChange={(categoryId) =>
                  setAssignmentCategory.mutate({
                    boardId: board.id,
                    appId: entry.appId,
                    categoryId,
                  })
                }
              />
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
          </div>
          <IconAction
            label={`Remove ${entry.app.name} from ${board.name}`}
            tooltip="Remove"
            danger
            onClick={() =>
              unassign.mutate({
                boardId: board.id,
                appId: entry.appId,
              })
            }
          >
            <LuX aria-hidden className="size-4" />
          </IconAction>
        </div>
      </div>
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
        {activeBoard ? (
          <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-2">
              <Tooltip.Root>
                <Tooltip.Trigger
                  render={
                    <button
                      type="button"
                      className={`relative z-30 inline-flex size-8 shrink-0 items-center justify-center rounded-[2px] text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50 ${activeBoard.id === defaultId ? "text-yellow-500 hover:text-yellow-500 dark:text-yellow-400 dark:hover:text-yellow-400" : ""}`}
                      disabled={activeBoard.id === defaultId}
                      onClick={() =>
                        setDefault.mutate(
                          { id: activeBoard.id },
                          { onSuccess: () => setDefaultId(activeBoard.id) },
                        )
                      }
                      aria-label="Set as default"
                    />
                  }
                >
                  <LuStar
                    aria-hidden
                    className={`size-4 ${activeBoard.id === defaultId ? "fill-current" : ""}`}
                  />
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Positioner sideOffset={6} className="z-50">
                    <Tooltip.Popup className="panel px-2 py-1 text-xs">
                      Set as default
                    </Tooltip.Popup>
                  </Tooltip.Positioner>
                </Tooltip.Portal>
              </Tooltip.Root>
              <h1 className="truncate text-xl font-semibold">
                <a
                  className="inline-flex max-w-full items-center gap-1.5 hover:underline"
                  href={`/board/${activeBoard.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className="truncate">{activeBoard.name}</span>
                  <LuExternalLink
                    aria-hidden
                    className="size-3.5 shrink-0 text-muted"
                  />
                </a>
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn text-xs"
                onClick={() =>
                  setRenaming({ id: activeBoard.id, name: activeBoard.name })
                }
              >
                <LuPencil aria-hidden className="size-4" />
                Rename board
              </button>
              <Button
                className="btn btn-primary text-xs"
                onClick={() =>
                  setCategoryDraft({
                    mode: "create",
                    boardId: activeBoard.id,
                  })
                }
              >
                <LuPlus aria-hidden className="size-4" />
                Add category
              </Button>
              <AlertDialog.Root>
                <AlertDialog.Trigger className="btn btn-danger text-xs">
                  <LuTrash2 aria-hidden className="size-4" />
                  Delete board
                </AlertDialog.Trigger>
                <ConfirmContent
                  title="Delete board"
                  description={`Delete “${activeBoard.name}”? This removes the board, its categories, and its assignments.`}
                >
                  <AlertDialog.Close className="btn">Cancel</AlertDialog.Close>
                  <AlertDialog.Close
                    className="btn btn-danger"
                    onClick={() => deleteBoard.mutate({ id: activeBoard.id })}
                  >
                    <LuTrash2 aria-hidden className="size-4" /> Delete
                  </AlertDialog.Close>
                </ConfirmContent>
              </AlertDialog.Root>
            </div>
          </div>
        ) : (
          <p className="text-muted">
            Boards belong to you and are reachable by anyone with the link.
          </p>
        )}
      </div>
      <Dialog.Root
        open={renaming !== null}
        onOpenChange={(open) => {
          if (!open) setRenaming(null)
        }}
      >
        <ModalContent withFooter title="Rename board">
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
            <ModalFooter>
              <Dialog.Close className="btn">Cancel</Dialog.Close>
              <Button type="submit" className="btn btn-primary">
                <LuPencil aria-hidden className="size-4" />
                Save
              </Button>
            </ModalFooter>
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
      />
      {visibleBoards.length === 0 ? (
        <p className="panel mt-4 border-dashed p-8 text-center text-muted">
          Create your first board to start sharing apps.
        </p>
      ) : (
        <DndContext
          id="boards-admin-apps"
          sensors={sensors}
          collisionDetection={boardCollisionDetection}
          onDragStart={(event) => {
            const boardId = String(event.active.data.current?.boardId ?? "")
            const appId = String(event.active.data.current?.appId ?? "")
            if (boardId && appId) setActiveDrag({ boardId, appId })
          }}
          onDragOver={(event) => {
            const over = event.over
            if (
              !over ||
              over.id === event.active.id ||
              String(over.data.current?.boardId ?? "") !==
                String(event.active.data.current?.boardId ?? "")
            ) {
              setDropPreview(null)
              return
            }
            if (over.data.current?.kind !== "slot") {
              setDropPreview(null)
              return
            }
            setDropPreview(String(over.id))
          }}
          onDragEnd={(event) => {
            const boardId = String(event.active.data.current?.boardId ?? "")
            if (
              event.over &&
              String(event.over.data.current?.boardId ?? "") === boardId
            ) {
              const board = visibleBoards.find((item) => item.id === boardId)
              const orderedBoard =
                board && optimisticOrders[board.id]
                  ? {
                      ...board,
                      apps: optimisticOrders[board.id].appIds.flatMap((id) => {
                        const entry = board.apps.find(
                          (item) => item.appId === id,
                        )
                        return entry
                          ? [
                              {
                                ...entry,
                                categoryId:
                                  entry.appId ===
                                  optimisticOrders[board.id].appId
                                    ? optimisticOrders[board.id].categoryId
                                    : entry.categoryId,
                              },
                            ]
                          : []
                      }),
                    }
                  : board
              if (orderedBoard) reorderGroup(orderedBoard, event)
            }
            setActiveDrag(null)
            setDropPreview(null)
          }}
          onDragCancel={() => {
            setActiveDrag(null)
            setDropPreview(null)
          }}
        >
          <ul className="mt-4 space-y-3">
            {visibleBoards.map((board) => {
              const available = apps.filter(
                (app) => !board.apps.some((entry) => entry.appId === app.id),
              )
              const savedOrder = optimisticOrders[board.id]
              const orderedBoard = savedOrder
                ? {
                    ...board,
                    apps: savedOrder.appIds.flatMap((appId) => {
                      const entry = board.apps.find(
                        (item) => item.appId === appId,
                      )
                      return entry
                        ? [
                            {
                              ...entry,
                              categoryId:
                                entry.appId === savedOrder.appId
                                  ? savedOrder.categoryId
                                  : entry.categoryId,
                            },
                          ]
                        : []
                    }),
                  }
                : board
              const groups = boardGroups(orderedBoard)
              return (
                <li key={board.id}>
                  <div className="space-y-4">
                    {groups.map((group) => {
                      const category = group.category
                      const categoryIndex = category
                        ? board.categories.findIndex(
                            (item) => item.id === category.id,
                          )
                        : -1
                      return (
                        <CategoryDropTarget
                          boardId={board.id}
                          categoryId={category?.id ?? null}
                          key={category?.id ?? "uncategorized"}
                          label={category?.title ?? "Uncategorised"}
                        >
                          <header className="flex flex-wrap items-center justify-between gap-2 rounded-[2px] bg-surface-alt px-3 py-2">
                            <div className="flex min-w-0 flex-col items-start">
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
                                          Apps here appear first on the public
                                          board without a category.
                                        </Popover.Popup>
                                      </Popover.Positioner>
                                    </Popover.Portal>
                                  </Popover.Root>
                                )}
                              </div>
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
                          {group.apps.length === 0 && (
                            <p className="px-3 py-2 text-sm text-muted">
                              No apps assigned.
                            </p>
                          )}
                          <ol>
                            {group.apps.map((entry, index) => (
                              <Fragment key={entry.appId}>
                                <InsertionSlot
                                  boardId={board.id}
                                  categoryId={category?.id ?? null}
                                  index={index}
                                  active={
                                    dropPreview ===
                                    `board:${board.id}:category:${category?.id ?? "uncategorized"}:slot:${index}`
                                  }
                                />
                                <SortableAssignment
                                  boardId={board.id}
                                  appId={entry.appId}
                                  id={`board:${board.id}:app:${entry.appId}`}
                                  isDragging={
                                    activeDrag?.boardId === board.id &&
                                    activeDrag.appId === entry.appId
                                  }
                                >
                                  {renderAssignment(board, entry)}
                                </SortableAssignment>
                              </Fragment>
                            ))}
                            <InsertionSlot
                              boardId={board.id}
                              categoryId={category?.id ?? null}
                              index={group.apps.length}
                              active={
                                dropPreview ===
                                `board:${board.id}:category:${category?.id ?? "uncategorized"}:slot:${group.apps.length}`
                              }
                            />
                          </ol>
                        </CategoryDropTarget>
                      )
                    })}
                  </div>
                </li>
              )
            })}
          </ul>
          <DragOverlay dropAnimation={null}>
            {activeDrag &&
              (() => {
                const app = visibleBoards
                  .find((board) => board.id === activeDrag.boardId)
                  ?.apps.find((entry) => entry.appId === activeDrag.appId)?.app
                return app ? (
                  <div className="flex items-center gap-2 border border-accent bg-surface px-3 py-2 shadow-lg">
                    <img
                      src={`/icons/${iconKey(app)}`}
                      alt=""
                      className="size-8 object-contain"
                    />
                    <span className="text-sm font-medium">{app.name}</span>
                  </div>
                ) : null
              })()}
          </DragOverlay>
        </DndContext>
      )}
    </section>
  )
}
