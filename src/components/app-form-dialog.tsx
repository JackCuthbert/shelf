"use client"

import { useEffect, useId, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Checkbox } from "@base-ui/react/checkbox"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { Select } from "@base-ui/react/select"
import { Tabs } from "@base-ui/react/tabs"
import { LuCheck, LuChevronDown, LuLoader, LuX } from "react-icons/lu"
import { CategorySelect } from "@/components/category-select"
import { NoAvailableAppsPlaceholder } from "@/components/available-apps-empty-state"
import { IconPicker } from "@/components/icon-picker"
import { ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"
import { iconKey } from "@/lib/app-icon"

export type AppRecord = {
  id: string
  name: string
  description: string
  url: string
  iconSource: string
  iconSlug: string | null
  customIconUrl: string | null
}
type Draft = {
  name: string
  description: string
  url: string
  iconSource: "dashboard" | "url"
  iconSlug: string
  iconUrl: string
}
const emptyDraft: Draft = {
  name: "",
  description: "",
  url: "",
  iconSource: "dashboard",
  iconSlug: "",
  iconUrl: "",
}

function BoardAssignmentCheckbox({
  boardName,
  checked,
  onCheckedChange,
}: {
  boardName: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        className="flex size-5 shrink-0 items-center justify-center rounded-[2px] border border-line bg-surface text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus data-[checked]:border-accent"
      >
        <Checkbox.Indicator>
          <LuCheck aria-hidden className="size-4" />
        </Checkbox.Indicator>
      </Checkbox.Root>
      Add to “{boardName}”
    </label>
  )
}

export function AppFormDialog({
  open,
  onOpenChange,
  app,
  trigger,
  onSaved,
  boards = [],
  initialBoardId = "",
  context = "none",
  existingApps,
  existingAppsLoading = false,
  onAssignExisting,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  app?: AppRecord | null
  trigger?: React.ReactNode
  onSaved?: () => void
  boards?: Array<{
    id: string
    name: string
    categories: Array<{ id: string; title: string }>
  }>
  initialBoardId?: string
  context?: "none" | "public-board" | "managed-board"
  existingApps?: Array<{
    id: string
    name: string
    url: string
    iconSource: string
    iconSlug: string | null
    iconHash: string | null
  }>
  existingAppsLoading?: boolean
  onAssignExisting?: (appId: string, categoryId: string | null) => Promise<void>
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [createdAppId, setCreatedAppId] = useState<string | null>(null)
  const [boardId, setBoardId] = useState(initialBoardId)
  const [categoryId, setCategoryId] = useState("")
  const [assignmentError, setAssignmentError] = useState("")
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"create" | "existing">("create")
  const [filter, setFilter] = useState("")
  const [selectedExistingAppId, setSelectedExistingAppId] = useState("")
  const [existingError, setExistingError] = useState("")
  const [savingExisting, setSavingExisting] = useState(false)
  const [addToCurrentBoard, setAddToCurrentBoard] = useState(true)
  const formId = useId()
  const assign = trpc.boards.assign.useMutation()
  const create = trpc.apps.create.useMutation({
    onSuccess: async (created) => {
      setCreatedAppId(created.id)
      if (boardId && (context === "none" || addToCurrentBoard)) {
        await assignCreatedApp(created.id)
        return
      }
      done()
    },
    onError: (cause) => setError(cause.message),
  })
  const update = trpc.apps.update.useMutation({
    onSuccess: done,
    onError: (cause) => setError(cause.message),
  })
  const pending = create.isPending || update.isPending
  const hasTabs =
    context === "public-board" && !!existingApps && !!onAssignExisting
  const currentBoard = boards.find((board) => board.id === initialBoardId)
  const selectedBoard = boards.find((board) => board.id === boardId)
  const boardOptions = [
    { value: "", label: "Do not add to a board" },
    ...boards.map((board) => ({ value: board.id, label: board.name })),
  ]

  useEffect(() => {
    if (
      categoryId &&
      selectedBoard &&
      !selectedBoard.categories.some((category) => category.id === categoryId)
    ) {
      setCategoryId("")
    }
  }, [categoryId, selectedBoard])

  useEffect(() => {
    if (
      selectedExistingAppId &&
      !existingApps?.some((item) => item.id === selectedExistingAppId)
    ) {
      setSelectedExistingAppId("")
    }
  }, [selectedExistingAppId, existingApps])

  useEffect(() => {
    if (!open) return
    setDraft(
      app
        ? {
            name: app.name,
            description: app.description ?? "",
            url: app.url,
            iconSource: app.iconSource === "url" ? "url" : "dashboard",
            iconSlug: app.iconSlug ?? "",
            iconUrl: app.customIconUrl ?? "",
          }
        : emptyDraft,
    )
    setError("")
    setAssignmentError("")
    setCreatedAppId(null)
    setBoardId(initialBoardId)
    setCategoryId("")
    setAddToCurrentBoard(true)
    setTab("create")
    setFilter("")
    setSelectedExistingAppId("")
    setExistingError("")
  }, [open, app])

  function done() {
    setCreatedAppId(null)
    onSaved?.()
    onOpenChange(false)
  }
  async function assignCreatedApp(appId: string) {
    if (!boardId) return
    setAssignmentError("")
    try {
      await assign.mutateAsync({
        boardId,
        appId,
        categoryId: context === "public-board" ? null : categoryId || null,
      })
      done()
    } catch (cause) {
      setAssignmentError(
        cause instanceof Error
          ? cause.message
          : "The app could not be added to the board.",
      )
    }
  }
  function payload() {
    const base = {
      name: draft.name,
      description: draft.description,
      url: draft.url,
    }
    return draft.iconSource === "url"
      ? { ...base, iconSource: "url" as const, iconUrl: draft.iconUrl }
      : { ...base, iconSource: "dashboard" as const, iconSlug: draft.iconSlug }
  }
  function save() {
    setError("")
    if (createdAppId) {
      if (context !== "none" && !addToCurrentBoard) {
        done()
        return
      }
      void assignCreatedApp(createdAppId)
      return
    }
    if (draft.iconSource === "dashboard" && !draft.iconSlug) {
      setError("Choose an icon before saving.")
      return
    }
    if (draft.iconSource === "url" && !draft.iconUrl.trim()) {
      setError("Enter an image URL before saving.")
      return
    }
    if (app) update.mutate({ id: app.id, ...payload() })
    else create.mutate(payload())
  }

  async function saveExisting() {
    if (!selectedExistingAppId || !onAssignExisting) return
    setExistingError("")
    setSavingExisting(true)
    try {
      await onAssignExisting(selectedExistingAppId, categoryId || null)
      onOpenChange(false)
    } catch (cause) {
      setExistingError(
        cause instanceof Error
          ? cause.message
          : "The app could not be added to this board.",
      )
    } finally {
      setSavingExisting(false)
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <Tabs.Root
        className="contents"
        value={tab}
        onValueChange={(value) => setTab(value as "create" | "existing")}
      >
        <ModalContent
          withFooter
          title={hasTabs ? "Add app" : app ? "Edit app" : "Create app"}
          hideTitle={hasTabs}
          flush={hasTabs}
          description={
            app
              ? undefined
              : "Apps are shared across every board in the household."
          }
          header={
            hasTabs ? (
              <Tabs.List
                aria-label="App actions"
                className="flex w-full shrink-0 border-b border-line bg-surface pr-12"
              >
                <Tabs.Tab
                  value="create"
                  className="px-3 py-4 text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus data-[active]:border-b-2 data-[active]:border-accent data-[active]:font-semibold data-[active]:text-foreground sm:px-5"
                >
                  Create app
                </Tabs.Tab>
                <Tabs.Tab
                  value="existing"
                  className="px-3 py-4 text-sm text-muted focus-visible:outline-2 focus-visible:outline-focus data-[active]:border-b-2 data-[active]:border-accent data-[active]:font-semibold data-[active]:text-foreground sm:px-5"
                >
                  Add existing app
                </Tabs.Tab>
              </Tabs.List>
            ) : (
              <Tabs.List className="sr-only">
                <Tabs.Tab value="create">Create app</Tabs.Tab>
              </Tabs.List>
            )
          }
          footer={
            <>
              <Dialog.Close className="btn">
                <LuX aria-hidden className="size-4" />
                Cancel
              </Dialog.Close>
              {hasTabs && tab === "existing" ? (
                <Button
                  type="button"
                  onClick={saveExisting}
                  disabled={!selectedExistingAppId || savingExisting}
                  className="btn btn-primary"
                >
                  {savingExisting ? (
                    <LuLoader aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <LuCheck aria-hidden className="size-4" />
                  )}
                  {savingExisting ? "Saving…" : "Save app"}
                </Button>
              ) : (
                <Button
                  type="submit"
                  form={formId}
                  disabled={pending || assign.isPending}
                  className="btn btn-primary"
                >
                  {pending || assign.isPending ? (
                    <LuLoader aria-hidden className="size-4 animate-spin" />
                  ) : (
                    <LuCheck aria-hidden className="size-4" />
                  )}
                  <span>
                    {pending || assign.isPending
                      ? "Saving…"
                      : createdAppId
                        ? "Retry board assignment"
                        : "Save app"}
                  </span>
                </Button>
              )}
            </>
          }
        >
          {hasTabs && existingApps && Boolean(onAssignExisting) && (
            <Tabs.Panel value="existing" className="p-5">
              <Input
                className="field"
                type="search"
                placeholder="Filter apps…"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                aria-label="Filter apps"
              />
              {existingAppsLoading ? (
                <NoAvailableAppsPlaceholder label="Loading available apps…" />
              ) : existingApps.length === 0 ? (
                <NoAvailableAppsPlaceholder />
              ) : (
                <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
                  {existingApps
                    .filter((item) =>
                      `${item.name} ${item.url}`
                        .toLowerCase()
                        .includes(filter.trim().toLowerCase()),
                    )
                    .map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-pressed={selectedExistingAppId === item.id}
                          onClick={() => setSelectedExistingAppId(item.id)}
                          className="flex w-full items-center gap-3 border border-line bg-background p-2 text-left hover:border-accent hover:bg-surface-alt aria-pressed:border-accent aria-pressed:bg-surface-alt"
                        >
                          <img
                            src={`/icons/${iconKey(item)}`}
                            alt=""
                            className="h-9 w-9 object-contain p-1"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">
                              {item.name}
                            </span>
                            <span className="block truncate text-xs text-muted">
                              {item.url}
                            </span>
                          </span>
                          {selectedExistingAppId === item.id && (
                            <LuCheck
                              aria-hidden
                              className="size-4 text-accent"
                            />
                          )}
                        </button>
                      </li>
                    ))}
                </ul>
              )}
              {currentBoard && (
                <div className="mt-4 space-y-1">
                  <span className="block text-xs text-muted">
                    Add to category (optional)
                  </span>
                  <CategorySelect
                    value={categoryId || null}
                    categories={currentBoard.categories}
                    label="Add to category (optional)"
                    className="w-full"
                    onChange={(value) => setCategoryId(value ?? "")}
                  />
                </div>
              )}
              {existingError && (
                <p
                  role="alert"
                  className="mt-3 border border-danger p-3 text-sm text-danger"
                >
                  {existingError}
                </p>
              )}
            </Tabs.Panel>
          )}
          <Tabs.Panel value="create" className={hasTabs ? "p-5" : "pb-5"}>
            <Form id={formId} onFormSubmit={save}>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field.Root name="name" className="space-y-2">
                  <Field.Label className="text-xs text-muted">Name</Field.Label>
                  <Input
                    className="field"
                    required
                    maxLength={120}
                    value={draft.name}
                    onChange={(event) =>
                      setDraft({ ...draft, name: event.target.value })
                    }
                  />
                  <Field.Error className="text-xs text-danger" />
                </Field.Root>
                <Field.Root name="url" className="space-y-2">
                  <Field.Label className="text-xs text-muted">URL</Field.Label>
                  <Input
                    className="field"
                    required
                    type="url"
                    placeholder="https://example.home"
                    value={draft.url}
                    onChange={(event) =>
                      setDraft({ ...draft, url: event.target.value })
                    }
                  />
                  <Field.Error className="text-xs text-danger" />
                </Field.Root>
              </div>
              <Field.Root name="description" className="mt-4 space-y-2">
                <Field.Label className="text-xs text-muted">
                  Description (optional)
                </Field.Label>
                <textarea
                  className="field min-h-20 resize-y"
                  maxLength={280}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
                <p className="text-xs text-muted">
                  {draft.description.length}/280
                </p>
              </Field.Root>
              <IconPicker
                value={{
                  source: draft.iconSource,
                  slug: draft.iconSlug,
                  url: draft.iconUrl,
                }}
                cachedSlug={
                  app?.iconSource === "dashboard" ? app.iconSlug : undefined
                }
                onChange={(icon) =>
                  setDraft({
                    ...draft,
                    iconSource: icon.source,
                    iconSlug: icon.slug,
                    iconUrl: icon.url,
                  })
                }
              />
              {!app && boards.length > 0 && (
                <div className="mt-4 space-y-3">
                  {context === "none" && (
                    <div className="space-y-1">
                      <span className="block text-xs text-muted">
                        Add to a board (optional)
                      </span>
                      <Select.Root
                        items={boardOptions}
                        value={boardId}
                        onValueChange={(value) => {
                          setBoardId(String(value ?? ""))
                          setCategoryId("")
                        }}
                      >
                        <Select.Trigger
                          type="button"
                          aria-label="Add to a board (optional)"
                          className="inline-flex w-full cursor-pointer items-center justify-between gap-2 rounded-[2px] border border-line bg-surface px-2.5 py-2 text-sm text-foreground hover:border-foreground focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus data-[popup-open]:border-focus"
                        >
                          <Select.Value />
                          <Select.Icon>
                            <LuChevronDown
                              aria-hidden
                              className="size-4 shrink-0 text-muted"
                            />
                          </Select.Icon>
                        </Select.Trigger>
                        <Select.Portal>
                          <Select.Positioner
                            side="bottom"
                            sideOffset={4}
                            align="end"
                            alignItemWithTrigger={false}
                            className="z-[60]"
                          >
                            <Select.Popup className="min-w-[var(--anchor-width)] rounded-[2px] border border-line bg-surface p-1 shadow-lg focus:outline-none">
                              <Select.List className="max-h-[var(--available-height)] overflow-y-auto">
                                {boardOptions.map((item) => (
                                  <Select.Item
                                    key={item.value || "none"}
                                    value={item.value}
                                    className="grid cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 rounded-[1px] px-2 py-1.5 text-sm data-[highlighted]:bg-surface-alt"
                                  >
                                    <Select.ItemIndicator className="col-start-1">
                                      <LuCheck
                                        aria-hidden
                                        className="size-4 text-accent"
                                      />
                                    </Select.ItemIndicator>
                                    <Select.ItemText className="col-start-2 truncate">
                                      {item.label}
                                    </Select.ItemText>
                                  </Select.Item>
                                ))}
                              </Select.List>
                            </Select.Popup>
                          </Select.Positioner>
                        </Select.Portal>
                      </Select.Root>
                    </div>
                  )}
                  {boardId &&
                  (context === "managed-board" || context === "none") &&
                  selectedBoard ? (
                    <div className="space-y-1">
                      <span className="block text-xs text-muted">
                        Add to category (optional)
                      </span>
                      <CategorySelect
                        value={categoryId || null}
                        categories={selectedBoard.categories}
                        label="Add to category (optional)"
                        className="w-full"
                        disabled={
                          context === "managed-board" && !addToCurrentBoard
                        }
                        onChange={(value) => setCategoryId(value ?? "")}
                      />
                    </div>
                  ) : null}
                </div>
              )}
              {assignmentError && (
                <p
                  role="alert"
                  className="mt-3 border border-danger p-3 text-sm text-danger"
                >
                  App created in the shared library, but board assignment
                  failed: {assignmentError}{" "}
                  {context === "public-board"
                    ? "Retry adding this app to the selected board."
                    : "Change the category if needed, then retry adding this app to the selected board."}{" "}
                  Its shared library entry is already saved.
                </p>
              )}
              {error && (
                <p
                  role="alert"
                  className="mt-3 border border-danger p-3 text-sm text-danger"
                >
                  {error} Your entries are still here; choose another icon or
                  retry saving.
                </p>
              )}
              {!app && context !== "none" && currentBoard && (
                <div className="mt-4">
                  <BoardAssignmentCheckbox
                    boardName={currentBoard.name}
                    checked={addToCurrentBoard}
                    onCheckedChange={setAddToCurrentBoard}
                  />
                </div>
              )}
            </Form>
          </Tabs.Panel>
        </ModalContent>
      </Tabs.Root>
    </Dialog.Root>
  )
}
