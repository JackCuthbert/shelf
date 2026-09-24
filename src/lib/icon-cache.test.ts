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
  directory = await mkdtemp(join(tmpdir(), "hometime-icons-"))
  return directory
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
})
