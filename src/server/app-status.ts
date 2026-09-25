import { prisma } from "@/lib/prisma"
import {
  createAppStatusService,
  type AppStatus,
} from "@/server/app-status-service"

function statusOf(value: string): AppStatus {
  return value === "up" || value === "down" ? value : "unknown"
}

export const appStatusService = createAppStatusService({
  listBoardApps: async (nanoid) => {
    const board = await prisma.board.findUnique({
      where: { nanoid },
      select: {
        apps: {
          select: {
            app: {
              select: {
                id: true,
                url: true,
                status: true,
                lastCheckedAt: true,
              },
            },
          },
        },
      },
    })
    if (!board) return null
    return board.apps.map(({ app }) => ({
      ...app,
      status: statusOf(app.status),
    }))
  },
  getApp: async (id) => {
    const app = await prisma.app.findUnique({
      where: { id },
      select: { id: true, url: true, status: true, lastCheckedAt: true },
    })
    return app ? { ...app, status: statusOf(app.status) } : null
  },
  isBoardAppAssigned: async (nanoid, appId) => {
    const board = await prisma.board.findUnique({
      where: { nanoid },
      select: { apps: { where: { appId }, select: { appId: true } } },
    })
    return Boolean(board?.apps.length)
  },
  updateStatus: async (id, status, lastCheckedAt, lastError, url) => {
    const result = await prisma.app.updateMany({
      where: { id, url },
      data: { status, lastCheckedAt, lastError },
    })
    return result.count > 0
  },
})
