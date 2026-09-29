import { expect, test, type Page } from "@playwright/test"
import { readFile } from "node:fs/promises"

async function capture(page: Page, name: string) {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images).map(async (image) => {
        await image.decode()
        if (!image.naturalWidth) throw new Error(`Missing icon: ${image.src}`)
      }),
    )
  })
  const client = await page.context().newCDPSession(page)
  const heading = page.locator("h1:visible, h2:visible").first()
  await heading.evaluate((element) => {
    const textElement = [element, ...element.querySelectorAll("*")].find(
      (candidate) =>
        Array.from(candidate.childNodes).some(
          (node) =>
            node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
        ),
    )
    if (!textElement) throw new Error("No heading text to check")
    textElement.setAttribute("data-screenshot-font", "")
  })
  await client.send("DOM.enable")
  await client.send("CSS.enable")
  const { root } = await client.send("DOM.getDocument")
  const { nodeId } = await client.send("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: "[data-screenshot-font]",
  })
  const { fonts } = await client.send("CSS.getPlatformFontsForNode", { nodeId })
  console.log(`${name} rendered fonts: ${JSON.stringify(fonts)}`)
  expect(fonts.length).toBeGreaterThan(0)
  expect(
    fonts.every(
      (font) =>
        font.isCustomFont && font.postScriptName.startsWith("IBMPlexMono-"),
    ),
  ).toBe(true)
  await client.detach()
  await page
    .locator("[data-screenshot-font]")
    .evaluate((element) => element.removeAttribute("data-screenshot-font"))
  await page.screenshot({
    path: `docs/screenshots/${name}.png`,
    fullPage: false,
    animations: "disabled",
    caret: "hide",
  })
}

test("regenerate the README screenshots", async ({ page }) => {
  await page.goto("/board/homelab1")
  await expect(
    page.getByText("Jellyfin", { exact: true }).first(),
  ).toBeVisible()
  await expect(
    page.getByText("Tools & infrastructure", { exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible()
  await expect(
    page
      .locator("#board-app-results section")
      .filter({
        has: page.getByRole("heading", { name: "Media", exact: true }),
      })
      .locator("li"),
  ).toHaveCount(6)
  expect(
    await page
      .locator("#board-app-results ul")
      .first()
      .evaluate(
        (grid) => getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      ),
  ).toBe(6)
  await capture(page, "board")

  await page.goto("/apps/jellyfin")
  await expect(page.getByRole("heading", { name: "Jellyfin" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open app" })).toBeVisible()
  const lastChecked = page
    .getByText("Last checked", { exact: true })
    .locator("..")
    .locator("time")
  const checkedAt = await lastChecked.getAttribute("datetime")
  if (!checkedAt) throw new Error("Missing last check time")
  await expect(lastChecked).toHaveText(
    new Intl.DateTimeFormat("en-AU", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Australia/Melbourne",
    }).format(new Date(checkedAt)),
  )
  await capture(page, "app")

  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill("jack@example.com")
  await page
    .getByLabel("Password", { exact: true })
    .fill("shelf-screenshot-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL("**/admin/boards")
  await page.goto("/admin/boards/homelab1")
  await expect(page.getByText("Uncategorised", { exact: true })).toBeVisible()
  await expect(page.getByText("Jellyfin", { exact: true })).toBeVisible()
  await capture(page, "management")

  // Only the third-party catalogue and previews are replaced. Shelf's pages,
  // authentication, forms, and API run against the seeded database.
  await page.route(
    "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json",
    (route) => route.fulfill({ json: { jellyfin: { base: "png" } } }),
  )
  await page.route(
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/**",
    async (route) =>
      route.fulfill({
        contentType: "image/png",
        body: await readFile("e2e/fixtures/icons/jellyfin.png"),
      }),
  )
  await page.getByRole("button", { name: "Create app", exact: true }).click()
  const dialog = page.getByRole("dialog")
  await expect(
    dialog.getByRole("heading", { name: "Create app" }),
  ).toBeVisible()
  await dialog.getByLabel("Name", { exact: true }).fill("Jellyfin Music")
  await dialog
    .getByLabel("URL", { exact: true })
    .fill("https://music.home.arpa")
  await dialog
    .locator("textarea")
    .fill("A dedicated home for your music collection.")
  await dialog.getByRole("button", { name: "jellyfin", exact: true }).click()
  await expect(
    dialog.getByRole("button", { name: "Change icon" }),
  ).toBeVisible()
  await capture(page, "create-app")
})
