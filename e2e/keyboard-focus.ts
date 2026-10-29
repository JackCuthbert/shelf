import { expect, test } from "@playwright/test"

test("keyboard focus moves from search to the first app without looping", async ({
  page,
}) => {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill("jack@example.com")
  await page
    .getByLabel("Password", { exact: true })
    .fill("shelf-screenshot-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL("**/admin/boards")
  await page.goto("/board/homelab1")

  const search = page.locator("#board-search")
  await expect(search).toBeFocused()

  await page.keyboard.press("Shift+Tab")
  await expect(page.locator("header").getByRole("button").last()).toBeFocused()

  await search.focus()
  const firstApp = page.locator("#board-app-results a").first()
  await firstApp.evaluate((element) => {
    const counter = { count: 0 }
    ;(window as unknown as { focusEvents: typeof counter }).focusEvents =
      counter
    element.addEventListener("focus", () => counter.count++)
  })
  await page.keyboard.press("Tab")
  await expect(firstApp).toBeFocused()

  await page.waitForTimeout(1000)
  await expect(firstApp).toBeFocused()
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { focusEvents: { count: number } }).focusEvents
          .count,
    ),
  ).toBeLessThanOrEqual(1)
  await expect(
    page.getByRole("tooltip", { name: /description$/ }),
  ).toBeVisible()
})

test("one Tab moves from a tile with a description to the next tile", async ({
  page,
}) => {
  await page.goto("/login")
  await page.getByLabel("Email", { exact: true }).fill("jack@example.com")
  await page
    .getByLabel("Password", { exact: true })
    .fill("shelf-screenshot-password")
  await page.getByRole("button", { name: "Sign in", exact: true }).click()
  await page.waitForURL("**/admin/boards")
  await page.goto("/board/homelab1")

  const tiles = page.locator("#board-app-results a")
  await tiles.first().focus()
  await expect(
    page.getByRole("tooltip", { name: /description$/ }),
  ).toBeVisible()

  await page.keyboard.press("Tab")
  await expect(tiles.nth(1)).toBeFocused()

  await page.keyboard.press("Shift+Tab")
  await expect(tiles.first()).toBeFocused()
})

test.describe("touch device", () => {
  test.use({ hasTouch: true, isMobile: true })

  test("a second tap on the info button closes the description", async ({
    page,
  }) => {
    await page.goto("/board/homelab1")

    const info = page.getByRole("button", { name: /^About / }).first()
    const description = page.getByRole("tooltip", { name: /description$/ })
    await info.tap()
    await expect(description).toBeVisible()
    await info.tap()
    await expect(description).toBeHidden()
  })
})
