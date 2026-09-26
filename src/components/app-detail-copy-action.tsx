"use client"

import { useEffect, useRef, useState } from "react"
import { Tooltip } from "@base-ui/react/tooltip"
import { LuCheck, LuCopy } from "react-icons/lu"

export function AppDetailCopyAction({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current)
    },
    [],
  )

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setError(false)
    } catch {
      setCopied(false)
      setError(true)
    }
    if (resetTimer.current) clearTimeout(resetTimer.current)
    resetTimer.current = setTimeout(() => {
      setCopied(false)
      setError(false)
    }, 2500)
  }

  return (
    <span className="ml-auto inline-flex shrink-0 items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-danger">
          Could not copy link
        </span>
      )}
      <Tooltip.Root>
        <Tooltip.Trigger
          render={
            <button
              type="button"
              onClick={() => void copy()}
              aria-label={copied ? "App link copied" : "Copy app link"}
              className="inline-flex size-8 cursor-pointer items-center justify-center rounded-[2px] text-muted hover:bg-surface-alt hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            />
          }
        >
          {copied ? (
            <LuCheck aria-hidden className="size-4" />
          ) : (
            <LuCopy aria-hidden className="size-4" />
          )}
        </Tooltip.Trigger>
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={6} className="z-50">
            <Tooltip.Popup className="panel px-2 py-1 text-xs">
              {copied ? "Copied" : "Copy app link"}
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </span>
  )
}
