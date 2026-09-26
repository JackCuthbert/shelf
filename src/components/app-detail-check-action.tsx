"use client"

import { useRouter } from "next/navigation"
import { Tooltip } from "@base-ui/react/tooltip"
import { LuRefreshCw } from "react-icons/lu"
import { trpc } from "@/components/trpc-provider"

export function AppDetailCheckAction({
  appId,
  appName,
}: {
  appId: string
  appName: string
}) {
  const router = useRouter()
  const check = trpc.apps.recheckStatus.useMutation({
    onSuccess: () => router.refresh(),
  })

  return (
    <span className="ml-auto inline-flex flex-col items-end gap-1">
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <button
              type="button"
              onClick={() => check.mutate({ id: appId })}
              disabled={check.isPending}
              aria-label={`Check ${appName} now`}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[2px] text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
            />
          }
        >
          <LuRefreshCw
            aria-hidden
            className={`size-4 ${check.isPending ? "animate-spin" : ""}`}
          />
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup className="panel px-2 py-1 text-xs">
              {check.isPending ? "Checking…" : "Check now"}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      {check.error && (
        <span role="alert" className="text-xs text-danger">
          Could not check app. Try again.
        </span>
      )}
    </span>
  )
}
