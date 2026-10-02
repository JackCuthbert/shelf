import { parseStatusCheckIntervalSeconds } from "../../../lib/app-status.ts"

export function getStatusCheckIntervalSeconds(): number {
  return parseStatusCheckIntervalSeconds(
    process.env.APP_STATUS_CHECK_INTERVAL_SECONDS,
  )
}
