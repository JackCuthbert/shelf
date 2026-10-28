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
  await expect(page.getByRole("dialog", { name: /description$/ })).toBeVisible()
})
