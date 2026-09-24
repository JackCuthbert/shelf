import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { AccountForm } from "./account-form"

it("offers OIDC sign-in when an instance provider is configured", () => {
  const html = renderToStaticMarkup(
    <AccountForm setup={false} signup={false} oidc={{ name: "Pocket ID" }} />,
  )
  expect(html).toContain("Continue with Pocket ID")
})

it("does not offer OIDC during first-account setup", () => {
  const html = renderToStaticMarkup(
    <AccountForm setup oidc={{ name: "Pocket ID" }} signup={false} />,
  )
  expect(html).not.toContain("Continue with Pocket ID")
})
