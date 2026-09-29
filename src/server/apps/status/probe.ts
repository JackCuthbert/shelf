import http from "node:http"
import https from "node:https"
import {
  PROBE_TIMEOUT_MS,
  RETRY_MIN_MS,
  type ProbeResult,
  type ProbeWork,
} from "../../../lib/app-status.ts"

export type ProbeRunnerOptions = {
  fetcher?: (url: string, options: RequestInit) => Promise<Response>
  sleep?: (ms: number) => Promise<void>
}

export const probeHttpsAgent = new https.Agent({ rejectUnauthorized: false })

// Native transport deliberately constructs a minimal response-like value: Node
// accepts statuses beyond Web Response's restricted 200–599 range.
export function nodeFetch(
  url: string,
  options: RequestInit,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    let parsed: URL
    try {
      parsed = new URL(url)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
        throw Object.assign(new Error("Unsupported protocol"), {
          code: "ERR_UNSUPPORTED_PROTOCOL",
        })
    } catch (error) {
      reject(error)
      return
    }
    const transport = parsed.protocol === "https:" ? https : http
    const request = transport.request(
      parsed,
      {
        method: options.method ?? "GET",
        agent: transport === https ? probeHttpsAgent : undefined,
        signal: options.signal ?? undefined,
      },
      (response) => {
        const status = response.statusCode ?? 0
        response.destroy()
        resolve({ status, body: null } as Response)
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

function errorCode(error: unknown): string | undefined {
  const code = (error as { code?: unknown } | null | undefined)?.code
  return typeof code === "string" ? code : undefined
}

function isTransient(error: unknown): boolean {
  const name = error instanceof Error ? error.name : ""
  return (
    name === "TimeoutError" ||
    ["ECONNRESET", "ECONNREFUSED", "EAI_AGAIN"].includes(errorCode(error) ?? "")
  )
}

function cancelBody(response: Response): void {
  try {
    void response.body?.cancel().catch(() => {})
  } catch {
    // Body disposal happens after headers and cannot change reachability.
  }
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createProbeRunner(options: ProbeRunnerOptions = {}) {
  const fetcher = options.fetcher ?? nodeFetch
  const sleep = options.sleep ?? defaultSleep

  return async (work: ProbeWork): Promise<ProbeResult> => {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const controller = new AbortController()
      const timeout = setTimeout(
        () =>
          controller.abort(new DOMException("Probe timed out", "TimeoutError")),
        PROBE_TIMEOUT_MS,
      )
      let timedOut = false
      let caught: unknown
      try {
        const response = await fetcher(work.url, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
        })
        clearTimeout(timeout)
        cancelBody(response)
        return { status: "up", lastError: null }
      } catch (error) {
        caught = error
        timedOut = controller.signal.aborted
      } finally {
        clearTimeout(timeout)
      }

      if (attempt === 1 && (timedOut || isTransient(caught))) {
        await sleep(RETRY_MIN_MS)
        continue
      }
      return {
        status: "down",
        lastError: describeProbeError(caught),
      }
    }
    return {
      status: "down",
      lastError: "Could not reach the app",
    }
  }
}
