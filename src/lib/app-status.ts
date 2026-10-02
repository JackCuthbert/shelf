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
  checkIntervalSeconds: number
}
export type ProbeTrigger = "manual" | "initial" | "automatic"
export type ProbeWork = {
  id: string
  url: string
  requestedAt: Date
  trigger: ProbeTrigger
}
export type ProbeResult = { status: "up" | "down"; lastError: string | null }

export const DEFAULT_STATUS_CHECK_INTERVAL_SECONDS = 3600
export const MAX_STATUS_CHECK_INTERVAL_SECONDS = 9_007_199_254_740
export const SCHEDULER_POLL_MS = 1_000
export const AUTOMATIC_START_SPACING_MS = 5_000
export const PROBE_TIMEOUT_MS = 15_000
export const RETRY_MIN_MS = 1_000
export const BOARD_POLL_MS = 30_000
export const ACTIVE_POLL_MS = 2_000

export function parseStatusCheckIntervalSeconds(
  value: string | undefined,
): number {
  if (value === undefined) return DEFAULT_STATUS_CHECK_INTERVAL_SECONDS
  const seconds = Number(value)
  if (
    !/^\d+$/.test(value) ||
    !Number.isSafeInteger(seconds) ||
    seconds < 60 ||
    seconds > MAX_STATUS_CHECK_INTERVAL_SECONDS
  ) {
    throw new Error(
      `APP_STATUS_CHECK_INTERVAL_SECONDS must be a base-10 whole number from 60 through ${MAX_STATUS_CHECK_INTERVAL_SECONDS}`,
    )
  }
  return seconds
}

export function isChecking(
  record: StatusRecord,
  now: Date,
  checkIntervalSeconds = DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
): boolean {
  return Boolean(
    record.probeRequestedAt ||
    !record.lastCheckedAt ||
    now.getTime() - record.lastCheckedAt.getTime() >=
      checkIntervalSeconds * 1_000,
  )
}

export function toStatusSnapshot(
  record: StatusRecord,
  now: Date,
  checkIntervalSeconds = DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
): AppStatusSnapshot {
  return {
    id: record.id,
    status: record.status,
    lastCheckedAt: record.lastCheckedAt?.getTime() ?? null,
    lastError: record.lastError,
    checking: isChecking(record, now, checkIntervalSeconds),
    checkIntervalSeconds,
  }
}
