"use client"

import { useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { Tooltip } from "@base-ui/react/tooltip"
import { LuPlus } from "react-icons/lu"
import { AppFormDialog } from "@/components/app-form-dialog"

export function CreateAppMenubarAction() {
  const [open, setOpen] = useState(false)
  return (
    <AppFormDialog
      open={open}
      onOpenChange={setOpen}
      app={null}
      trigger={
        <Tooltip.Root>
          <Tooltip.Trigger
            render={
              <Dialog.Trigger
                className="btn"
                aria-label="Create app"
                title="Create app"
              />
            }
          >
            <LuPlus aria-hidden className="size-4" />
          </Tooltip.Trigger>
          <Tooltip.Portal>
            <Tooltip.Positioner sideOffset={6}>
              <Tooltip.Popup className="panel px-2 py-1 text-xs">
                Create app
              </Tooltip.Popup>
            </Tooltip.Positioner>
          </Tooltip.Portal>
        </Tooltip.Root>
      }
    />
  )
}
