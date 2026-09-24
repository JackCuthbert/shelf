import http from "node:http"
import https from "node:https"

export type AppStatus = "unknown" | "up" | "down"

export type AppStatusRecord = {
  id: string
  url: string
  status: AppStatus
  lastCheckedAt: Date | null
}

export interface AppStatusRepository {
  listBoardApps(nanoid: string): Promise<AppStatusRecord[] | null>
  isBoardAppAssigned(nanoid: string, appId: string): Promise<boolean>
  updateStatus(
    id: string,
    status: Exclude<AppStatus, "unknown">,
    at: Date,
  ): Promise<void>
}

type Fetcher = (url: string, options: RequestInit) => Promise<Response>

const CACHE_MS = 60_000
const PROBE_TIMEOUT_MS = 3_000

// Self-hosted apps commonly serve HTTPS with a self-signed certificate. A
// liveness probe only needs an HTTP response, so certificate verification is
// disabled rather than reporting a reachable app as down.
export const probeHttpsAgent = new https.Agent({ rejectUnauthorized: false })

function nodeFetch(url: string, options: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    const transport = new URL(url).protocol === "https:" ? https : http
    const request = transport.request(
      url,
      {
        method: options.method ?? "GET",
        agent: transport === https ? probeHttpsAgent : undefined,
        signal: options.signal ?? undefined,
      },
      (response) => {
        response.destroy()
        resolve(new Response(null, { status: response.statusCode ?? 0 }))
      },
    )
    request.on("error", reject)
    request.end()
  })
}

export function createAppStatusService(
  repository: AppStatusRepository,
  fetcher: Fetcher = nodeFetch,
  now: () => Date = () => new Date(),
) {
  const inFlight = new Map<
    string,
    Promise<{ status: "up" | "down"; lastCheckedAt: Date }>
  >()

  async function probe(nanoid: string, app: AppStatusRecord) {
    if (!(await repository.isBoardAppAssigned(nanoid, app.id))) return null
    const existing = inFlight.get(app.id)
    if (existing) return existing

    const check = (async () => {
      let status: "up" | "down"
      try {
        const response = await fetcher(app.url, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        })
        await response.body?.cancel().catch(() => {})
        status = "up"
      } catch {
        status = "down"
      }
      const lastCheckedAt = now()
      await repository.updateStatus(app.id, status, lastCheckedAt)
      return { status, lastCheckedAt }
    })()

    inFlight.set(app.id, check)
    try {
      return await check
    } finally {
      inFlight.delete(app.id)
    }
  }

  return {
    async refreshBoard(nanoid: string) {
      const apps = await repository.listBoardApps(nanoid)
      if (!apps) return null
      const results = await Promise.all(
        apps.map(async (app) => {
          const isFresh =
            app.lastCheckedAt !== null &&
            now().getTime() - app.lastCheckedAt.getTime() < CACHE_MS
          if (isFresh)
            return {
              id: app.id,
              status: app.status,
              lastCheckedAt: app.lastCheckedAt,
            }
          const result = await probe(nanoid, app)
          return result ? { id: app.id, ...result } : null
        }),
      )
      return results.filter((result) => result !== null)
    },
  }
}
