import { expect, test, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"
import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"
import { resolve } from "node:path"
import { PrismaLibSql } from "@prisma/adapter-libsql"
import { PrismaClient } from "../src/generated/prisma/client"

const PREFIX = "Theme Icons Test"
const METADATA =
  "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json"
const CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/**"
const catalogue = {
  jellyfin: {
    base: "png",
    colors: { light: "jellyfin", dark: "jellyfin-dark" },
  },
  grafana: { base: "png" },
  radarr: { base: "png" },
}
const previewFiles: Record<string, string> = {
  "jellyfin-dark": "sonarr",
}
const HASH_ICON = /\/icons\/[0-9a-f]{64}$/

let fixtureServer: Server
let fixtureOrigin = ""
let flakyRequests = 0
let metadataRequests = 0
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url: `file:${resolve("data/screenshots/app.db")}`,
  }),
})

const AUTH_STATE = "data/screenshots/owner-auth.json"

test.describe.configure({ mode: "serial" })
test.use({ storageState: AUTH_STATE })

test.beforeAll(async ({ browser, baseURL }) => {
  const context = await browser.newContext({
    baseURL,
    storageState: undefined,
  })
  const page = await context.newPage()
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill("jack@example.com")
  await page
    .getByLabel("Password", { exact: true })
    .fill("shelf-screenshot-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL("**/admin/boards")
  await context.storageState({ path: AUTH_STATE })
  await context.close()

  const images = {
    "/light.png": await readFile("e2e/fixtures/icons/radarr.png"),
    "/dark.png": await readFile("e2e/fixtures/icons/grafana.png"),
    "/other.png": await readFile("e2e/fixtures/icons/immich.png"),
  } as Record<string, Buffer>
  fixtureServer = createServer((request, response) => {
    const path = request.url ?? ""
    // Only requests without sec-fetch-dest (the app server) can fail once.
    const serverDownload = !request.headers["sec-fetch-dest"]
    if (path === "/flaky.png" && serverDownload && flakyRequests++ === 0) {
      response.writeHead(500).end()
    } else if (path === "/flaky.png") {
      response.writeHead(200, { "content-type": "image/png" })
      response.end(images["/other.png"])
    } else if (path === "/not-png") {
      response.writeHead(200, { "content-type": "text/html" }).end("<p>no</p>")
    } else if (images[path]) {
      response.writeHead(200, { "content-type": "image/png" })
      response.end(images[path])
    } else {
      response.writeHead(404).end()
    }
  })
  await new Promise<void>((done) => fixtureServer.listen(0, "127.0.0.1", done))
  fixtureOrigin = `http://127.0.0.1:${(fixtureServer.address() as AddressInfo).port}`
})

test.afterAll(async () => {
  await new Promise((done) => fixtureServer?.close(done) ?? done(null))
  await prisma.app.deleteMany({ where: { name: { startsWith: PREFIX } } })
  await prisma.$disconnect()
})

async function stubCatalogue(page: Page) {
  await page.route(METADATA, (route) => {
    metadataRequests++
    return route.fulfill({ json: catalogue })
  })
  await page.route(CDN, async (route) => {
    const slug = route.request().url().split("/").pop()!.replace(".png", "")
    return route.fulfill({
      contentType: "image/png",
      body: await readFile(
        `e2e/fixtures/icons/${previewFiles[slug] ?? slug}.png`,
      ),
    })
  })
}

async function appId(name: string) {
  const app = await prisma.app.findFirstOrThrow({ where: { name } })
  return app.id
}

const slotButton = (page: Page, slot: "Light" | "Dark") =>
  page
    .getByRole("dialog")
    .getByRole("button", { name: new RegExp(`^${slot} mode`) })

async function pickIcon(page: Page, slug: string) {
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("searchbox").fill(slug)
  await dialog
    .getByLabel("Icon results")
    .getByRole("button", { name: slug, exact: true })
    .click()
}

async function setUrl(page: Page, url: string) {
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Image URL" }).click()
  await dialog.getByLabel("Image URL", { exact: true }).fill(url)
}

async function createApp(page: Page, name: string) {
  await page.goto("/admin/boards/homelab1")
  await page.getByRole("button", { name: "Create app", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await dialog.getByLabel("Name", { exact: true }).fill(name)
  await dialog
    .getByLabel("URL", { exact: true })
    .fill(`https://${name.toLowerCase().replaceAll(" ", "-")}.home.arpa`)
  return dialog
}

async function saveApp(page: Page) {
  const dialog = page.getByRole("dialog")
  await dialog.getByRole("button", { name: "Save app" }).click()
  await expect(dialog).toBeHidden()
}

async function openEditor(page: Page, name: string) {
  await page.goto(`/apps/${await appId(name)}`)
  await page.getByRole("button", { name: "Edit app" }).first().click()
  return page.getByRole("dialog")
}

function tileIcon(page: Page, name: string) {
  return page
    .locator("#board-app-results li")
    .filter({ has: page.getByTitle(name) })
    .locator("img")
    .first()
}

const currentSrc = (image: ReturnType<typeof tileIcon>) =>
  image.evaluate((element: HTMLImageElement) =>
    element.currentSrc
      ? new URL(element.currentSrc).pathname.replace(/\.png$/, "")
      : "",
  )

test("saves and reopens distinct dashboard icons per appearance", async ({
  page,
}) => {
  const name = `${PREFIX} Dashboard`
  await stubCatalogue(page)
  metadataRequests = 0
  const dialog = await createApp(page, name)
  await pickIcon(page, "jellyfin")
  await expect(dialog.getByText("Editing light mode")).toBeVisible()
  await slotButton(page, "Dark").click()
  await expect(dialog.getByText("Editing dark mode")).toBeVisible()
  await pickIcon(page, "jellyfin-dark")
  await slotButton(page, "Light").click()
  await slotButton(page, "Dark").click()
  expect(metadataRequests).toBe(1)
  await saveApp(page)

  const reopened = await openEditor(page, name)
  await expect(slotButton(page, "Light")).toContainText("jellyfin")
  await expect(slotButton(page, "Dark")).toContainText("jellyfin-dark")
  await slotButton(page, "Dark").click()
  await expect(reopened.getByText("Selected icon")).toBeVisible()
  await expect(
    reopened.locator("p", { hasText: /^jellyfin-dark$/ }),
  ).toBeVisible()
})

test("switches board, library and detail icons with device appearance", async ({
  page,
}) => {
  const name = `${PREFIX} Dashboard`
  await stubCatalogue(page)
  await page.goto("/board/homelab1")
  await page.evaluate(() => ((window as { marker?: number }).marker = 1))
  const tile = tileIcon(page, name)
  await expect(tile).toBeVisible()
  await page.emulateMedia({ colorScheme: "light" })
  await expect.poll(() => currentSrc(tile)).toBe("/icons/jellyfin")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => currentSrc(tile)).toBe("/icons/jellyfin-dark")
  expect(
    await page.evaluate(() => (window as { marker?: number }).marker),
  ).toBe(1)

  const id = await appId(name)
  await page.goto("/admin/apps")
  const libraryIcon = page
    .locator("li, article, tr")
    .filter({ hasText: name })
    .locator("img")
    .first()
  await page.emulateMedia({ colorScheme: "light" })
  await expect.poll(() => currentSrc(libraryIcon)).toBe("/icons/jellyfin")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => currentSrc(libraryIcon)).toBe("/icons/jellyfin-dark")

  await page.goto(`/apps/${id}`)
  const detailIcon = page.locator("main img").first()
  await page.emulateMedia({ colorScheme: "light" })
  await expect.poll(() => currentSrc(detailIcon)).toBe("/icons/jellyfin")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => currentSrc(detailIcon)).toBe("/icons/jellyfin-dark")
})

test("keeps legacy apps on one icon in both appearances", async ({ page }) => {
  await page.goto("/board/homelab1")
  const tile = tileIcon(page, "Jellyfin")
  await expect(tile).toBeVisible()
  await expect(
    page
      .locator("#board-app-results li")
      .filter({ has: page.getByTitle("Jellyfin", { exact: true }) })
      .locator("source"),
  ).toHaveCount(0)
  await page.emulateMedia({ colorScheme: "light" })
  await expect.poll(() => currentSrc(tile)).toBe("/icons/jellyfin")
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => currentSrc(tile)).toBe("/icons/jellyfin")
})

test("keeps editor previews on fixed backgrounds in both appearances", async ({
  page,
}) => {
  await stubCatalogue(page)
  const dialog = await openEditor(page, `${PREFIX} Dashboard`)
  const backgrounds = () =>
    Promise.all(
      (["Light", "Dark"] as const).map((slot) =>
        slotButton(page, slot)
          .locator("img, span")
          .first()
          .evaluate((element) => getComputedStyle(element).backgroundColor),
      ),
    )
  await page.emulateMedia({ colorScheme: "light" })
  await expect(dialog).toBeVisible()
  const light = await backgrounds()
  await page.emulateMedia({ colorScheme: "dark" })
  expect(await backgrounds()).toEqual(light)
  expect(light).toEqual(["rgb(255, 255, 255)", "rgb(20, 24, 31)"])
})

test("saves mixed sources, copies as a snapshot and shares one icon", async ({
  page,
}) => {
  const name = `${PREFIX} Mixed`
  await stubCatalogue(page)
  await createApp(page, name)
  await setUrl(page, `${fixtureOrigin}/light.png`)
  await slotButton(page, "Dark").click()
  await pickIcon(page, "grafana")
  await saveApp(page)

  await page.goto("/board/homelab1")
  const tile = tileIcon(page, name)
  await page.emulateMedia({ colorScheme: "light" })
  await expect
    .poll(() => tile.evaluate((e: HTMLImageElement) => e.currentSrc))
    .toMatch(HASH_ICON)
  await page.emulateMedia({ colorScheme: "dark" })
  await expect.poll(() => currentSrc(tile)).toBe("/icons/grafana")

  const editor = await openEditor(page, name)
  const imageUrl = editor.getByLabel("Image URL", { exact: true })
  await expect(slotButton(page, "Light")).toContainText(
    `${fixtureOrigin}/light.png`,
  )
  await expect(slotButton(page, "Dark")).toContainText("grafana")
  await slotButton(page, "Light").click()
  await editor.getByRole("button", { name: "Use for dark mode →" }).click()
  await expect(editor.getByRole("status")).toHaveText("Copied to dark mode.")
  await expect(slotButton(page, "Dark")).toContainText(
    `${fixtureOrigin}/light.png`,
  )
  await imageUrl.fill(`${fixtureOrigin}/dark.png`)
  await expect(slotButton(page, "Dark")).toContainText(
    `${fixtureOrigin}/light.png`,
  )
  await imageUrl.fill(`${fixtureOrigin}/light.png`)
  await saveApp(page)

  await page.goto("/board/homelab1")
  const shared = tileIcon(page, name)
  await expect(
    page
      .locator("#board-app-results li")
      .filter({ has: page.getByTitle(name) })
      .locator("source"),
  ).toHaveCount(0)
  await page.emulateMedia({ colorScheme: "light" })
  const lightSrc = await shared.evaluate((e: HTMLImageElement) => e.currentSrc)
  await page.emulateMedia({ colorScheme: "dark" })
  expect(await shared.evaluate((e: HTMLImageElement) => e.currentSrc)).toBe(
    lightSrc,
  )
})

test("switches slots and sources without losing either selection", async ({
  page,
}) => {
  await stubCatalogue(page)
  const dialog = await openEditor(page, `${PREFIX} Dashboard`)
  const imageUrl = dialog.getByLabel("Image URL", { exact: true })
  await slotButton(page, "Dark").click()
  await dialog.getByRole("button", { name: "Image URL" }).click()
  await imageUrl.fill(`${fixtureOrigin}/dark.png`)
  await dialog.getByRole("button", { name: "Dashboard Icons" }).click()
  await expect(
    dialog.locator("p", { hasText: /^jellyfin-dark$/ }),
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Image URL" }).click()
  await expect(imageUrl).toHaveValue(`${fixtureOrigin}/dark.png`)
  await slotButton(page, "Light").click()
  await expect(dialog.getByText("Editing light mode")).toBeVisible()
  await expect(dialog.locator("p", { hasText: /^jellyfin$/ })).toBeVisible()
})

test("retains drafts and retries after a failed icon download", async ({
  page,
}) => {
  const name = `${PREFIX} Dashboard`
  await stubCatalogue(page)
  const dialog = await openEditor(page, name)
  const imageUrl = dialog.getByLabel("Image URL", { exact: true })
  await slotButton(page, "Dark").click()
  await setUrl(page, `${fixtureOrigin}/not-png`)
  await dialog.getByRole("button", { name: "Save app" }).click()
  await expect(dialog.getByRole("alert")).toContainText("must return a PNG")
  await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(name)
  await expect(slotButton(page, "Dark")).toContainText(
    `${fixtureOrigin}/not-png`,
  )
  await expect(slotButton(page, "Light")).toContainText("jellyfin")

  await imageUrl.fill(`${fixtureOrigin}/flaky.png`)
  flakyRequests = 0
  await dialog.getByRole("button", { name: "Save app" }).click()
  await expect(dialog.getByRole("alert")).toContainText("HTTP 500")
  await expect(slotButton(page, "Dark")).toContainText(
    `${fixtureOrigin}/flaky.png`,
  )
  await dialog.getByRole("button", { name: "Save app" }).click()
  await expect(dialog).toBeHidden()
  const saved = await prisma.app.findFirstOrThrow({ where: { name } })
  expect(saved.darkIconSource).toBe("url")
  expect(saved.darkIconHash).toMatch(/^[0-9a-f]{64}$/)
  expect(saved.iconSlug).toBe("jellyfin")
})

test("keeps the modal compact and reachable at desktop and short heights", async ({
  page,
}) => {
  await stubCatalogue(page)
  const dialog = await openEditor(page, `${PREFIX} Dashboard`)
  const box = await dialog.boundingBox()
  expect(box!.width).toBeLessThanOrEqual(480.5)
  expect(box!.width).toBeGreaterThan(470)

  await page.setViewportSize({ width: 1280, height: 420 })
  const body = dialog.locator("div.overflow-y-auto").first()
  const scroll = await body.evaluate((element) => ({
    client: element.clientHeight,
    scroll: element.scrollHeight,
  }))
  expect(scroll.scroll).toBeGreaterThan(scroll.client)
  const save = dialog.getByRole("button", { name: "Save app" })
  const popup = await dialog.boundingBox()
  expect(popup!.height).toBeLessThanOrEqual(420 * 0.9 + 1)
  expect(await body.evaluate((element) => element.scrollTop)).toBe(0)
  await expect(save).toBeInViewport()
  const saveBox = await save.boundingBox()
  expect(saveBox!.y).toBeGreaterThanOrEqual(popup!.y)
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(
    popup!.y + popup!.height + 0.5,
  )
  await body.evaluate((element) => element.scrollTo(0, element.scrollHeight))
  await expect(save).toBeInViewport()
})

test("fits a 360px viewport and works from the keyboard", async ({ page }) => {
  await stubCatalogue(page)
  await page.setViewportSize({ width: 360, height: 740 })
  const dialog = await openEditor(page, `${PREFIX} Dashboard`)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  expect(
    await dialog.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true)

  await slotButton(page, "Light").focus()
  await page.keyboard.press("Tab")
  await expect(slotButton(page, "Dark")).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(dialog.getByText("Editing dark mode")).toBeVisible()
  await page.keyboard.press("Tab")
  await expect(
    dialog.getByRole("button", { name: "← Use for light mode" }),
  ).toBeFocused()
  await page.keyboard.press("Enter")
  await expect(dialog.getByRole("status")).toHaveText("Copied to light mode.")
  await page.keyboard.press("Tab")
  await expect(
    dialog.getByRole("button", { name: "Dashboard Icons" }),
  ).toBeFocused()
  await page.keyboard.press("Tab")
  const urlSource = dialog.getByRole("button", { name: "Image URL" })
  await expect(urlSource).toBeFocused()
  await page.keyboard.press("Space")
  await expect(urlSource).toHaveAttribute("aria-pressed", "true")
})
