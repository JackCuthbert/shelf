import { createHash, randomUUID } from "node:crypto"
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { iconSlugSchema } from "./app-validation"
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"

const CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/"
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
const MAX_ICON_BYTES = 5 * 1024 * 1024
export const iconDirectory = process.env.HOMETIME_ICON_DIR ?? "/data/icons"

function assertPng(bytes: Buffer, message: string) {
  if (
    bytes.length < PNG_SIGNATURE.length ||
    bytes.length > MAX_ICON_BYTES ||
    !bytes.subarray(0, 8).equals(PNG_SIGNATURE)
  ) {
    throw new Error(message)
  }
}

export function createIconCache(
  directory = iconDirectory,
  download: (slug: string) => Promise<Buffer> = downloadPng,
  fetchUrl: (url: string) => Promise<Buffer> = downloadUrl,
) {
  async function exists(key: string): Promise<boolean> {
    try {
      await readFile(join(directory, `${key}.png`))
      return true
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error
      return false
    }
  }

  async function write(key: string, bytes: Buffer) {
    await mkdir(directory, { recursive: true })
    const destination = join(directory, `${key}.png`)
    const temporary = join(directory, `.${key}.${randomUUID()}.tmp`)
    try {
      await writeFile(temporary, bytes, { flag: "wx" })
      await rename(temporary, destination)
    } catch (error) {
      await rm(temporary, { force: true })
      throw error
    }
  }

  return {
    async ensure(slug: string): Promise<boolean> {
      iconSlugSchema.parse(slug)
      if (slug === PLACEHOLDER_ICON_SLUG) return false
      if (await exists(slug)) return false
      const bytes = await download(slug)
      assertPng(bytes, "Dashboard Icons returned an invalid PNG.")
      await write(slug, bytes)
      return true
    },
    async storeFromUrl(
      url: string,
    ): Promise<{ hash: string; created: boolean }> {
      const bytes = await fetchUrl(url)
      assertPng(bytes, "The image URL must return a PNG.")
      const hash = createHash("sha256").update(bytes).digest("hex")
      if (await exists(hash)) return { hash, created: false }
      await write(hash, bytes)
      return { hash, created: true }
    },
    async remove(key: string): Promise<void> {
      iconSlugSchema.parse(key)
      if (key === PLACEHOLDER_ICON_SLUG) return
      await rm(join(directory, `${key}.png`), { force: true })
    },
  }
}

async function downloadPng(slug: string): Promise<Buffer> {
  const response = await fetch(`${CDN}${slug}.png`, {
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok)
    throw new Error(
      `Could not download the selected icon (HTTP ${response.status}).`,
    )
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("image/png"))
    throw new Error("Dashboard Icons returned an invalid PNG.")
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > MAX_ICON_BYTES)
    throw new Error("Dashboard Icons image is too large.")
  return bytes
}

async function downloadUrl(url: string): Promise<Buffer> {
  const response = await fetch(url, { signal: AbortSignal.timeout(15_000) })
  if (!response.ok)
    throw new Error(`Could not download the image (HTTP ${response.status}).`)
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("image/png"))
    throw new Error("The image URL must return a PNG.")
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length > MAX_ICON_BYTES) throw new Error("The image is too large.")
  return bytes
}

export const iconCache = createIconCache()
