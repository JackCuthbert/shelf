export type AppStatus = "unknown" | "up" | "down"
export type StatusRecord = {
  id: string
  url: string
  status: AppStatus
  lastCheckedAt: Date | null
  lastError: string | null
  probeRequestedAt: Date | null
}
export type AppStatusSnapshot = {
  id: string
  status: AppStatus
  lastCheckedAt: number | null
  lastError: string | null
  checking: boolean
}
export type ProbeTrigger = "manual" | "initial" | "hourly"
export type ProbeWork = {
  id: string
  url: string
  requestedAt: Date
  trigger: ProbeTrigger
}
export type ProbeResult = { status: "up" | "down"; lastError: string | null }

export const STATUS_FRESHNESS_MS = 3_600_000
export const SCHEDULER_POLL_MS = 1_000
export const HOURLY_START_SPACING_MS = 5_000
export const PROBE_TIMEOUT_MS = 15_000
export const RETRY_MIN_MS = 1_000
export const BOARD_POLL_MS = 30_000
export const ACTIVE_POLL_MS = 2_000

export function isChecking(record: StatusRecord, now: Date): boolean {
  return Boolean(
    record.probeRequestedAt ||
    !record.lastCheckedAt ||
    now.getTime() - record.lastCheckedAt.getTime() >= STATUS_FRESHNESS_MS,
  )
}

export function toStatusSnapshot(
  record: StatusRecord,
  now: Date,
): AppStatusSnapshot {
  return {
    id: record.id,
    status: record.status,
    lastCheckedAt: record.lastCheckedAt?.getTime() ?? null,
    lastError: record.lastError,
    checking: isChecking(record, now),
  }
}
