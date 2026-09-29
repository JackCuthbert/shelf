import { prisma } from "../../../lib/prisma.ts"
import { createAppStatusRepository } from "./repository.ts"
import { createAppStatusScheduler } from "./scheduler.ts"
import { createProbeRunner } from "./probe.ts"
import { createAppStatusService } from "./service.ts"

const probe = createProbeRunner()

export const runAppStatusScheduler = createAppStatusScheduler({
  repository: createAppStatusRepository(prisma),
  probe,
})

export const appStatusService = createAppStatusService(
  createAppStatusRepository(prisma),
)
