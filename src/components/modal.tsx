"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Dialog } from "@base-ui/react/dialog";
import { LuX } from "react-icons/lu";

export function ModalContent({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <Dialog.Portal>
    <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
    <Dialog.Popup className="panel fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[min(92vw,30rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Dialog.Title className="text-base font-semibold">{title}</Dialog.Title>
          {description && <Dialog.Description className="mt-1 text-xs text-muted">{description}</Dialog.Description>}
        </div>
        <Dialog.Close aria-label="Close" className="btn px-2 py-1"><LuX aria-hidden className="size-4" /></Dialog.Close>
      </div>
      <div className="mt-4">{children}</div>
    </Dialog.Popup>
  </Dialog.Portal>;
}

export function ConfirmContent({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return <AlertDialog.Portal>
    <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
    <AlertDialog.Popup className="panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 p-5">
      <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
      {description && <AlertDialog.Description className="mt-2 text-sm text-muted">{description}</AlertDialog.Description>}
      <div className="mt-4 flex justify-end gap-2">{children}</div>
    </AlertDialog.Popup>
  </AlertDialog.Portal>;
}
