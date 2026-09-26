"use client"

import { AlertDialog } from "@base-ui/react/alert-dialog"
import { Dialog } from "@base-ui/react/dialog"
import { LuX } from "react-icons/lu"

export function ModalContent({
  title,
  description,
  wide = false,
  hideTitle = false,
  flush = false,
  withFooter = false,
  header,
  footer,
  children,
}: {
  title: string
  description?: string
  wide?: boolean
  hideTitle?: boolean
  flush?: boolean
  withFooter?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog.Portal>
      <Dialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
      <Dialog.Popup
        className={`panel fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] flex-col overflow-hidden ${wide ? "w-[min(92vw,44rem)]" : "w-[min(92vw,30rem)]"} -translate-x-1/2 -translate-y-1/2`}
      >
        <div
          className={
            hideTitle
              ? "absolute right-3 top-3 z-30"
              : "flex shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-5 py-4"
          }
        >
          <div className="min-w-0">
            <Dialog.Title
              className={hideTitle ? "sr-only" : "text-base font-semibold"}
            >
              {title}
            </Dialog.Title>
            {description && !hideTitle && (
              <Dialog.Description className="mt-1 text-xs text-muted">
                {description}
              </Dialog.Description>
            )}
          </div>
          <Dialog.Close aria-label="Close" className="btn px-2 py-1">
            <LuX aria-hidden className="size-4" />
          </Dialog.Close>
        </div>
        {header}
        <div
          className={`min-h-0 overflow-y-auto ${flush ? "" : "px-5 pt-4"} ${!flush && !withFooter ? "pb-5" : ""}`}
        >
          {children}
        </div>
        {footer && (
          <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface px-5 py-2">
            {footer}
          </div>
        )}
      </Dialog.Popup>
    </Dialog.Portal>
  )
}

export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div aria-hidden className="h-5" />
      <div className="sticky bottom-0 z-10 -mx-5 flex justify-end gap-2 border-t border-line bg-surface px-5 pt-2 pb-3">
        {children}
      </div>
    </>
  )
}

export function ConfirmContent({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <AlertDialog.Portal>
      <AlertDialog.Backdrop className="fixed inset-0 z-40 bg-black/50" />
      <AlertDialog.Popup className="panel fixed left-1/2 top-1/2 z-50 flex max-h-[90vh] w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden">
        <AlertDialog.Title className="shrink-0 px-5 pt-5 text-base font-semibold">
          {title}
        </AlertDialog.Title>
        {description && (
          <AlertDialog.Description className="min-h-0 overflow-y-auto px-5 py-3 text-sm text-muted">
            {description}
          </AlertDialog.Description>
        )}
        <div className="flex shrink-0 justify-end gap-2 border-t border-line bg-surface px-5 pt-2 pb-3">
          {children}
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Portal>
  )
}
