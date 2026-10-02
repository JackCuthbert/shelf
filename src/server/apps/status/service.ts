import {
  DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
  toStatusSnapshot,
  type AppStatusSnapshot,
} from "../../../lib/app-status.ts"
import type { AppStatusRepository } from "./repository.ts"

export type { AppStatusRepository } from "./repository"

export function createAppStatusService(
  repository: AppStatusRepository,
  now: () => Date = () => new Date(),
  getCheckIntervalSeconds: () => number = () =>
    DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
) {
  return {
    async boardStatuses(nanoid: string): Promise<AppStatusSnapshot[] | null> {
      const records = await repository.listBoardApps(nanoid)
      const checkIntervalSeconds = getCheckIntervalSeconds()
      return (
        records?.map((record) =>
          toStatusSnapshot(record, now(), checkIntervalSeconds),
        ) ?? null
      )
    },
    async appStatuses(ids: string[]): Promise<AppStatusSnapshot[]> {
      const uniqueIds = [...new Set(ids)]
      const records = await repository.listApps(uniqueIds)
      const checkIntervalSeconds = getCheckIntervalSeconds()
      return records.map((record) =>
        toStatusSnapshot(record, now(), checkIntervalSeconds),
      )
    },
    async requestCheck(id: string): Promise<{ accepted: true } | null> {
      const accepted = await repository.requestManual(id, now())
      return accepted ? { accepted: true } : null
    },
  }
}
