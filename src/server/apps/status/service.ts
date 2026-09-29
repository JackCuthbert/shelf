import {
  toStatusSnapshot,
  type AppStatusSnapshot,
} from "../../../lib/app-status.ts"
import type { AppStatusRepository } from "./repository.ts"

export type { AppStatusRepository } from "./repository"

export function createAppStatusService(
  repository: AppStatusRepository,
  now: () => Date = () => new Date(),
) {
  return {
    async boardStatuses(nanoid: string): Promise<AppStatusSnapshot[] | null> {
      const records = await repository.listBoardApps(nanoid)
      return records?.map((record) => toStatusSnapshot(record, now())) ?? null
    },
    async appStatuses(ids: string[]): Promise<AppStatusSnapshot[]> {
      const uniqueIds = [...new Set(ids)]
      const records = await repository.listApps(uniqueIds)
      return records.map((record) => toStatusSnapshot(record, now()))
    },
    async requestCheck(id: string): Promise<{ accepted: true } | null> {
      const accepted = await repository.requestManual(id, now())
      return accepted ? { accepted: true } : null
    },
  }
}
