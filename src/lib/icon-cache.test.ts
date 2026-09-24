import { createHash } from "node:crypto"
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createIconCache } from "./icon-cache"
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])
let directory = ""
afterEach(async () => {
  if (directory) await rm(directory, { recursive: true, force: true })
  directory = ""
})

async function setup() {
  directory = await mkdtemp(join(tmpdir(), "shelf-icons-"))
  return directory
}

function sha256(bytes: Buffer) {
  return createHash("sha256").update(bytes).digest("hex")
}

describe("icon cache", () => {
  it("downloads a valid PNG once and reuses the cached file", async () => {
    const path = await setup()
    const download = vi.fn(async () => png)
    const cache = createIconCache(path, download)
    await cache.ensure("home-assistant")
    await cache.ensure("home-assistant")
    expect(download).toHaveBeenCalledTimes(1)
    expect(await readFile(join(path, "home-assistant.png"))).toEqual(png)
  })

  it("leaves no partial file when a download fails", async () => {
    const path = await setup()
    const cache = createIconCache(path, async () => {
      throw new Error("offline")
    })
    await expect(cache.ensure("home-assistant")).rejects.toThrow("offline")
    expect(await readdir(path)).toEqual([])
  })

  it("rejects non-PNG content without replacing a cached file", async () => {
    const path = await setup()
    const cache = createIconCache(path, async () => Buffer.from("not png"))
    await expect(cache.ensure("home-assistant")).rejects.toThrow("PNG")
    expect(await readdir(path)).toEqual([])
  })

  it("keeps the placeholder available without downloading or writing a file", async () => {
    const path = await setup()
    const download = vi.fn(async () => png)
    const cache = createIconCache(path, download)
    await cache.ensure(PLACEHOLDER_ICON_SLUG)
    await cache.remove(PLACEHOLDER_ICON_SLUG)
    expect(download).not.toHaveBeenCalled()
    expect(await readdir(path)).toEqual([])
  })

  it("stores a custom image under its content hash and reuses it", async () => {
    const path = await setup()
    const fetchUrl = vi.fn(async () => png)
    const cache = createIconCache(path, undefined, fetchUrl)
    const first = await cache.storeFromUrl("https://images.home/a.png")
    const second = await cache.storeFromUrl("https://images.home/a.png")
    expect(first).toEqual({ hash: sha256(png), created: true })
    expect(second).toEqual({ hash: sha256(png), created: false })
    expect(fetchUrl).toHaveBeenCalledTimes(2)
    expect(await readFile(join(path, `${sha256(png)}.png`))).toEqual(png)
  })

  it("stores identical images from different URLs only once", async () => {
    const path = await setup()
    const cache = createIconCache(path, undefined, async () => png)
    await cache.storeFromUrl("https://images.home/a.png")
    const second = await cache.storeFromUrl("https://images.home/b.png")
    expect(second.created).toBe(false)
    expect(await readdir(path)).toEqual([`${sha256(png)}.png`])
  })

  it("rejects a custom image that is not a PNG without writing a file", async () => {
    const path = await setup()
    const cache = createIconCache(path, undefined, async () =>
      Buffer.from("not png"),
    )
    await expect(
      cache.storeFromUrl("https://images.home/a.png"),
    ).rejects.toThrow("PNG")
    expect(await readdir(path)).toEqual([])
  })

  it("removes a cached custom image by hash", async () => {
    const path = await setup()
    const cache = createIconCache(path, undefined, async () => png)
    const { hash } = await cache.storeFromUrl("https://images.home/a.png")
    await cache.remove(hash)
    expect(await readdir(path)).toEqual([])
  })
})
