import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { AccountSettings } from "./account-settings"

it("shows three independent account forms and their required fields", () => {
  const html = renderToStaticMarkup(
    <AccountSettings name="Alex" email="alex@example.com" />,
  )
  expect(html.match(/<form/g)).toHaveLength(3)
  expect(html).toContain('name="name"')
  expect(html).toContain('name="email"')
  expect(html.match(/name="currentPassword"/g)).toHaveLength(2)
  expect(html).toContain('name="newPassword"')
  expect(html).toContain('minLength="8"')
})
