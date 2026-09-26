"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@base-ui/react/dialog"
import { LuPencil } from "react-icons/lu"
import { AppFormDialog, type AppRecord } from "@/components/app-form-dialog"

export function AppDetailEditAction({ app }: { app: AppRecord }) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  return (
    <AppFormDialog
      open={open}
      onOpenChange={setOpen}
      app={app}
      onSaved={() => router.refresh()}
      trigger={
        <Dialog.Trigger className="btn">
          <LuPencil aria-hidden className="size-4" />
          Edit app
        </Dialog.Trigger>
      }
    />
  )
}
