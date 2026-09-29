import { prisma } from "../lib/prisma.ts"
import { createAppStatusRepository } from "./app-status-repository.ts"
import { createAppStatusScheduler } from "./app-status-scheduler.ts"
import { createProbeRunner } from "./app-probe.ts"
import { createAppStatusService } from "./app-status-service.ts"

const probe = createProbeRunner()

export const runAppStatusScheduler = createAppStatusScheduler({
  repository: createAppStatusRepository(prisma),
  probe,
})

export const appStatusService = createAppStatusService(
  createAppStatusRepository(prisma),
)
