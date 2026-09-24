import { z } from "zod"

export type HomarrApp = {
  sourceId: string
  name: string
  description: string
  url: string
  iconUrl: string
  importable: boolean
  reason: string | null
}

export class HomarrError extends Error {}

const REQUEST_TIMEOUT_MS = 15_000
const MAX_APPS = 1_000
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024

export const homarrConnectionSchema = z.object({
  baseUrl: z.string().trim().min(1, "Enter the Homarr address."),
  apiKey: z.string().trim().min(1, "Enter a Homarr API key."),
})

export type HomarrConnection = z.infer<typeof homarrConnectionSchema>

const homarrAppSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    description: z.string().nullish(),
    href: z.string().nullish(),
    iconUrl: z.string().nullish(),
  })
  .passthrough()

export function normalizeHomarrBaseUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new HomarrError("Enter a valid HTTP(S) Homarr address.")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new HomarrError("The Homarr address must use HTTP or HTTPS.")
  if (parsed.username || parsed.password)
    throw new HomarrError(
      "Remove the username and password from the Homarr address.",
    )
  const path = parsed.pathname.replace(/\/+$/, "")
  return `${parsed.origin}${path}`
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function normalizeHomarrApp(
  record: z.infer<typeof homarrAppSchema>,
): HomarrApp {
  const name = (record.name ?? "").trim()
  const description = (record.description ?? "").trim().slice(0, 280)
  const href = (record.href ?? "").trim()
  const iconUrl = (record.iconUrl ?? "").trim()
  const sourceId = record.id === undefined ? "" : String(record.id)
  const base = { sourceId, name, description, url: href, iconUrl }
  if (name.length === 0)
    return {
      ...base,
      importable: false,
      reason: "Homarr has no name for this app.",
    }
  if (!isHttpUrl(href))
    return {
      ...base,
      importable: false,
      reason: href
        ? "Homarr URL is not HTTP(S)."
        : "Homarr has no URL for this app.",
    }
  return {
    ...base,
    url: new URL(href).toString(),
    importable: true,
    reason: null,
  }
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "")
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
    throw new HomarrError("Homarr returned a response that is too large.")
  if (!response.body) return ""
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    total += value.byteLength
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel()
      throw new HomarrError("Homarr returned a response that is too large.")
    }
    chunks.push(value)
  }
  return new TextDecoder().decode(concatBytes(chunks))
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0)
  const result = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.byteLength
  }
  return result
}

export async function fetchHomarrApps(
  input: HomarrConnection,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<HomarrApp[]> {
  const doFetch = options.fetchImpl ?? fetch
  const base = normalizeHomarrBaseUrl(input.baseUrl)

  let response: Response
  try {
    response = await doFetch(`${base}/api/apps`, {
      headers: { ApiKey: input.apiKey.trim(), Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "manual",
    })
  } catch {
    throw new HomarrError(
      "Could not reach the Homarr instance at that address.",
    )
  }

  if (
    response.type === "opaqueredirect" ||
    (response.status >= 300 && response.status < 400)
  )
    throw new HomarrError("Homarr responded with a redirect.")
  if (response.status === 401 || response.status === 403)
    throw new HomarrError("Homarr rejected the API key.")
  if (response.status === 404)
    throw new HomarrError("No Homarr API was found at that address.")
  if (!response.ok)
    throw new HomarrError(`Homarr responded with HTTP ${response.status}.`)

  const body = await readLimited(response)
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new HomarrError("Homarr returned an unexpected response.")
  }

  const records = z.array(homarrAppSchema).safeParse(parsed)
  if (!records.success)
    throw new HomarrError("Homarr returned an unexpected response.")
  if (records.data.length > MAX_APPS)
    throw new HomarrError("Homarr returned too many apps to import.")
  return records.data.map(normalizeHomarrApp)
}
