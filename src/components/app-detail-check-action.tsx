"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { LuRefreshCw } from "react-icons/lu"
import type { AppStatusSnapshot } from "@/lib/app-status"
import { useManualAppCheck } from "@/components/use-manual-app-check"

export function AppDetailCheckAction({
  appId,
  appName,
  snapshot,
}: {
  appId: string
  appName: string
  snapshot: AppStatusSnapshot
}) {
  const router = useRouter()
  const checks = useManualAppCheck([snapshot])
  const checking = checks.isChecking(appId)
  const current = checks.snapshots[appId] ?? snapshot
  useEffect(() => {
    if (!checking && current.lastCheckedAt !== snapshot.lastCheckedAt)
      router.refresh()
  }, [checking, current.lastCheckedAt, snapshot.lastCheckedAt, router])

  return (
    <span className="inline-flex items-center gap-2">
      {checking && (
        <span
          role="img"
          aria-label={`${current.status} status; checking`}
          className={`size-2.5 rounded-full motion-safe:animate-pulse ${current.status === "up" ? "bg-green-600 dark:bg-green-400" : current.status === "down" ? "bg-danger" : "bg-muted"}`}
        />
      )}
      <button
        type="button"
        onClick={() => void checks.request(appId).catch(() => {})}
        disabled={checking}
        aria-label={`Check ${appName} now`}
        className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[2px] text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LuRefreshCw
          aria-hidden
          className={`size-4 ${checking ? "animate-spin" : ""}`}
        />
      </button>
      {checks.errors[appId] && (
        <span role="alert" className="text-xs text-danger">
          {checks.errors[appId]}{" "}
          <button
            type="button"
            className="underline"
            onClick={() =>
              checks.errors[appId]?.includes("refresh")
                ? checks.retry(appId)
                : void checks.request(appId).catch(() => {})
            }
          >
            Retry
          </button>
        </span>
      )}
    </span>
  )
}
