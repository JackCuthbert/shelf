"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Tooltip } from "@base-ui/react/tooltip"
import { LuPlus } from "react-icons/lu"
import { AppFormDialog } from "@/components/app-form-dialog"
import { trpc } from "@/components/trpc-provider"

export function CreateAppMenubarAction({
  boards = [],
  initialBoardId = "",
  context = "none",
  existingApps,
  existingAppsLoading = false,
  onAssignExisting,
  onSaved,
}: {
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
  onSaved?: () => void
}) {
  const [open, setOpen] = useState(false)
  const { data: ownedBoards = [] } = trpc.boards.list.useQuery()
  const availableBoards = ownedBoards.length > 0 ? ownedBoards : boards
  const actionLabel = context === "public-board" ? "Add app" : "Create app"
  return (
    <AppFormDialog
      open={open}
      onOpenChange={setOpen}
      app={null}
      boards={availableBoards.map((board) => ({
        id: board.id,
        name: board.name,
        categories: board.categories,
      }))}
      initialBoardId={initialBoardId}
      context={context}
      existingApps={existingApps}
      existingAppsLoading={existingAppsLoading}
      onAssignExisting={onAssignExisting}
      onSaved={onSaved}
      trigger={
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Dialog.Trigger
                className="btn bg-green-700 text-white hover:bg-green-800"
                aria-label={actionLabel}
                title={actionLabel}
              />
            }
          >
            <LuPlus aria-hidden className="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="panel px-2 py-1 text-xs">
                {actionLabel}
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      }
    />
  )
}
