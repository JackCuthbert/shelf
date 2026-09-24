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

it("offers explicit OIDC linking for a configured provider", () => {
  const html = renderToStaticMarkup(
    <AccountSettings
      name="Alex"
      email="alex@example.com"
      oidc={{ name: "Pocket ID", connected: false }}
    />,
  )
  expect(html).toContain("Connected identity providers")
  expect(html).toContain("Connect Pocket ID")
})

it("shows the configured OIDC provider as connected", () => {
  const html = renderToStaticMarkup(
    <AccountSettings
      name="Alex"
      email="alex@example.com"
      oidc={{ name: "Pocket ID", connected: true }}
    />,
  )
  expect(html).toContain("Pocket ID connected")
  expect(html).not.toContain("Connect Pocket ID")
})
