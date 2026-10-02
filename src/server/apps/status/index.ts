import { prisma } from "../../../lib/prisma.ts"
import { createAppStatusRepository } from "./repository.ts"
import { createAppStatusScheduler } from "./scheduler.ts"
import { createProbeRunner } from "./probe.ts"
import { createAppStatusService } from "./service.ts"
import { getStatusCheckIntervalSeconds } from "./config.ts"

const probe = createProbeRunner()

export function runAppStatusScheduler(
  checkIntervalSeconds = getStatusCheckIntervalSeconds(),
) {
  return createAppStatusScheduler({
    repository: createAppStatusRepository(prisma, checkIntervalSeconds),
    probe,
  })()
}

export const appStatusService = createAppStatusService(
  createAppStatusRepository(prisma),
  undefined,
  getStatusCheckIntervalSeconds,
)
