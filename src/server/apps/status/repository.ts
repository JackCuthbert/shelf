import type { PrismaClient } from "../../../generated/prisma/client.ts"
import {
  type AppStatus,
  DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
  type ProbeResult,
  type ProbeTrigger,
  type ProbeWork,
  type StatusRecord,
} from "../../../lib/app-status.ts"

export interface AppStatusRepository {
  listBoardApps(nanoid: string): Promise<StatusRecord[] | null>
  listApps(ids: string[]): Promise<StatusRecord[]>
  requestManual(id: string, now: Date): Promise<boolean>
  selectNext(now: Date): Promise<{ id: string; trigger: ProbeTrigger } | null>
  markPending(
    id: string,
    trigger: ProbeTrigger,
    now: Date,
  ): Promise<ProbeWork | null>
  publish(
    work: ProbeWork,
    result: ProbeResult,
    completedAt: Date,
  ): Promise<boolean>
}

const statuses = new Set(["unknown", "up", "down"])
function toRecord(app: {
  id: string
  url: string
  status: string
  lastCheckedAt: Date | null
  lastError: string | null
  probeRequestedAt: Date | null
}): StatusRecord {
  return {
    ...app,
    status: (statuses.has(app.status) ? app.status : "unknown") as AppStatus,
  }
}

export function createAppStatusRepository(
  db: PrismaClient,
  checkIntervalSeconds = DEFAULT_STATUS_CHECK_INTERVAL_SECONDS,
): AppStatusRepository {
  const readAll = async () => (await db.app.findMany()).map(toRecord)
  return {
    async listBoardApps(nanoid) {
      const board = await db.board.findUnique({
        where: { id: nanoid },
        include: { apps: { include: { app: true } } },
      })
      return board?.apps.map(({ app }) => toRecord(app)) ?? null
    },
    async listApps(ids) {
      if (!ids.length) return []
      return (await db.app.findMany({ where: { id: { in: ids } } })).map(
        toRecord,
      )
    },
    async requestManual(id, now) {
      const changed = await db.app.updateMany({
        where: { id, probeRequestedAt: null },
        data: { probeRequestedAt: now },
      })
      return (
        changed.count === 1 ||
        (changed.count === 0 &&
          Boolean(await db.app.findUnique({ where: { id } })))
      )
    },
    async selectNext(now) {
      const records = await readAll()
      const pending = records
        .filter((app) => app.probeRequestedAt)
        .sort(
          (a, b) =>
            a.probeRequestedAt!.getTime() - b.probeRequestedAt!.getTime() ||
            a.id.localeCompare(b.id),
        )[0]
      if (pending) return { id: pending.id, trigger: "manual" }
      const initial = records
        .filter((app) => !app.lastCheckedAt)
        .sort((a, b) => a.id.localeCompare(b.id))[0]
      if (initial) return { id: initial.id, trigger: "initial" }
      const automatic = records
        .filter(
          (app) =>
            app.lastCheckedAt &&
            now.getTime() - app.lastCheckedAt.getTime() >=
              checkIntervalSeconds * 1_000,
        )
        .sort(
          (a, b) =>
            a.lastCheckedAt!.getTime() - b.lastCheckedAt!.getTime() ||
            a.id.localeCompare(b.id),
        )[0]
      return automatic ? { id: automatic.id, trigger: "automatic" } : null
    },
    async markPending(id, trigger, now) {
      const app = await db.app.findUnique({ where: { id } })
      if (!app) return null
      const requestedAt = app.probeRequestedAt ?? now
      if (!app.probeRequestedAt) {
        const changed = await db.app.updateMany({
          where: { id, url: app.url, probeRequestedAt: null },
          data: { probeRequestedAt: requestedAt },
        })
        if (!changed.count) return null
      }
      return { id, url: app.url, requestedAt, trigger }
    },
    async publish(work, result, completedAt) {
      const changed = await db.app.updateMany({
        where: {
          id: work.id,
          url: work.url,
          probeRequestedAt: work.requestedAt,
        },
        data: {
          status: result.status,
          lastError: result.lastError,
          lastCheckedAt: completedAt,
          probeRequestedAt: null,
        },
      })
      return changed.count === 1
    },
  }
}
