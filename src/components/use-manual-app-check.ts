"use client"

import { useCallback, useEffect, useState } from "react"
import { ACTIVE_POLL_MS, type AppStatusSnapshot } from "@/lib/app-status"
import { trpc } from "@/components/trpc-provider"
import { usePageVisible } from "@/components/use-page-visible"

export function useManualAppCheck(initial: AppStatusSnapshot[] = []) {
  const visible = usePageVisible()
  const utils = trpc.useUtils()
  const [snapshots, setSnapshots] = useState<Record<string, AppStatusSnapshot>>(
    () =>
      Object.fromEntries(initial.map((snapshot) => [snapshot.id, snapshot])),
  )
  const [pending, setPending] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      initial
        .filter((snapshot) => snapshot.checking)
        .map(({ id }) => [id, true]),
    ),
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [retryNonce, setRetryNonce] = useState(0)
  const requestMutation = trpc.apps.recheckStatus.useMutation()
  const request = useCallback(
    async (id: string) => {
      setErrors((current) => ({ ...current, [id]: "" }))
      try {
        await requestMutation.mutateAsync({ id })
        setPending((current) => ({ ...current, [id]: true }))
      } catch (error) {
        setErrors((current) => ({
          ...current,
          [id]: "Could not check app. Try again.",
        }))
        throw error
      }
    },
    [requestMutation.mutateAsync],
  )

  useEffect(() => {
    const ids = Object.keys(pending).filter((id) => pending[id])
    if (!visible || !ids.length) return
    let alive = true
    const read = async () => {
      try {
        const result = await utils.apps.statuses.fetch({ ids })
        if (!alive) return
        setSnapshots((current) => ({
          ...current,
          ...Object.fromEntries(result.map((item) => [item.id, item])),
        }))
        for (const item of result) {
          if (item.checking) continue
          setPending((current) => ({ ...current, [item.id]: false }))
          setErrors((current) => ({ ...current, [item.id]: "" }))
          utils.apps.list.setData(undefined, (apps) =>
            apps?.map((app) =>
              app.id === item.id
                ? {
                    ...app,
                    status: item.status,
                    lastCheckedAt:
                      item.lastCheckedAt === null
                        ? null
                        : new Date(item.lastCheckedAt).toISOString(),
                    lastError: item.lastError,
                  }
                : app,
            ),
          )
        }
        for (const id of ids)
          if (!result.some((item) => item.id === id)) {
            setPending((current) => ({ ...current, [id]: false }))
            setErrors((current) => ({
              ...current,
              [id]: "This app was deleted.",
            }))
          }
      } catch {
        if (alive)
          for (const id of ids)
            setErrors((current) => ({
              ...current,
              [id]: "Could not refresh status. Retry the check.",
            }))
      }
    }
    void read()
    const timer = window.setInterval(() => void read(), ACTIVE_POLL_MS)
    return () => {
      alive = false
      window.clearInterval(timer)
    }
  }, [visible, pending, retryNonce, utils.apps.statuses, utils.apps.list])

  const isChecking = useCallback(
    (id: string) =>
      Boolean(
        pending[id] ||
        (requestMutation.isPending && requestMutation.variables?.id === id),
      ),
    [pending, requestMutation.isPending, requestMutation.variables],
  )
  const retry = useCallback(
    (_id: string) => setRetryNonce((value) => value + 1),
    [],
  )
  return { request, isChecking, snapshots, errors, retry }
}
