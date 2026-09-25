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
  getApp(id: string): Promise<AppStatusRecord | null>
  isBoardAppAssigned(nanoid: string, appId: string): Promise<boolean>
  updateStatus(
    id: string,
    status: Exclude<AppStatus, "unknown">,
    at: Date,
    error: string | null,
    url: string,
  ): Promise<boolean>
}

type Fetcher = (url: string, options: RequestInit) => Promise<Response>

const CACHE_MS = 10 * 60_000
const PROBE_TIMEOUT_MS = 15_000

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

export function describeProbeError(error: unknown): string {
  const name = error instanceof Error ? error.name : ""
  const code = (error as { code?: string } | null | undefined)?.code ?? ""
  const message = error instanceof Error ? error.message : ""
  if (name === "TimeoutError" || name === "AbortError")
    return "Timed out after 15s"
  if (code === "ECONNREFUSED") return "Connection refused"
  if (code === "ENOTFOUND" || code === "EAI_AGAIN") return "Host not found"
  if (code.includes("CERT") || /certificate/i.test(message))
    return "TLS certificate error"
  return "Could not reach the app"
}

export function createAppStatusService(
  repository: AppStatusRepository,
  fetcher: Fetcher = nodeFetch,
  now: () => Date = () => new Date(),
) {
  const inFlight = new Map<
    string,
    Promise<{ status: "up" | "down"; lastCheckedAt: Date } | null>
  >()

  async function probe(app: AppStatusRecord) {
    const url = app.url
    const key = JSON.stringify([app.id, url])
    const existing = inFlight.get(key)
    if (existing) return existing

    const check = (async () => {
      let status: "up" | "down"
      let error: string | null = null
      try {
        const response = await fetcher(url, {
          method: "GET",
          redirect: "manual",
          signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
        })
        await response.body?.cancel().catch(() => {})
        status = "up"
      } catch (cause) {
        status = "down"
        error = describeProbeError(cause)
      }
      const lastCheckedAt = now()
      const stored = await repository.updateStatus(
        app.id,
        status,
        lastCheckedAt,
        error,
        url,
      )
      return stored ? { status, lastCheckedAt } : null
    })()

    inFlight.set(key, check)
    try {
      return await check
    } finally {
      inFlight.delete(key)
    }
  }

  return {
    async refreshApp(id: string) {
      const app = await repository.getApp(id)
      if (!app) return false
      await probe(app)
      return true
    },
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
          if (!(await repository.isBoardAppAssigned(nanoid, app.id)))
            return null
          const result = await probe(app)
          return result ? { id: app.id, ...result } : null
        }),
      )
      return results.filter((result) => result !== null)
    },
  }
}
