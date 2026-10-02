import {
  AUTOMATIC_START_SPACING_MS,
  SCHEDULER_POLL_MS,
  type ProbeResult,
} from "../../../lib/app-status.ts"
import type { AppStatusRepository } from "./repository.ts"

export function createAppStatusScheduler(options: {
  repository: AppStatusRepository
  probe: (
    work: import("../../../lib/app-status.ts").ProbeWork,
  ) => Promise<ProbeResult>
  now?: () => Date
  sleep?: (ms: number) => Promise<void>
}) {
  const now = options.now ?? (() => new Date())
  const sleep =
    options.sleep ??
    ((ms) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  let lastAutomaticStart: number | null = null
  return async function run(): Promise<never> {
    while (true) {
      const selected = await options.repository.selectNext(now())
      if (!selected) {
        await sleep(SCHEDULER_POLL_MS)
        continue
      }
      if (selected.trigger === "automatic" && lastAutomaticStart !== null) {
        const remaining =
          AUTOMATIC_START_SPACING_MS - (now().getTime() - lastAutomaticStart)
        if (remaining > 0) {
          await sleep(Math.min(remaining, SCHEDULER_POLL_MS))
          continue
        }
      }
      const work = await options.repository.markPending(
        selected.id,
        selected.trigger,
        now(),
      )
      if (!work) continue
      if (work.trigger === "automatic") lastAutomaticStart = now().getTime()
      const startedAt = Date.now()
      console.info(
        ` [status-scheduler] CHECK ${work.id} started (${work.trigger})`,
      )
      const result = await options.probe(work)
      const published = await options.repository.publish(work, result, now())
      console.info(
        ` [status-scheduler] CHECK ${work.id} ${published ? result.status : "discarded"} in ${Date.now() - startedAt}ms${published && result.lastError ? ` (${result.lastError})` : ""}`,
      )
    }
  }
}
