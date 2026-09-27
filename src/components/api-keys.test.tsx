import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/lib/auth-client", () => ({
  authClient: { apiKey: { create: vi.fn(), delete: vi.fn() } },
}))

import { ApiKeys } from "./api-keys"

it("lists API key metadata without rendering plaintext key values", () => {
  const html = renderToStaticMarkup(
    <ApiKeys
      keys={[
        {
          id: "key-1",
          name: "Assistant",
          createdAt: "2026-09-26T10:00:00.000Z",
          lastRequest: null,
        },
      ]}
    />,
  )
  expect(html).toContain("Assistant")
  expect(html).toContain("Created")
  expect(html).toContain("Last used Never")
  expect(html).not.toContain("secret")
})

it("explains agent setup and links to the OpenAPI spec in the account style", () => {
  const html = renderToStaticMarkup(<ApiKeys keys={[]} />)
  expect(html).toContain("Agents can set up boards and apps for you.")
  expect(html).toContain('href="/api/v1/openapi.json"')
  expect(html).toContain("OpenAPI specification")
  expect(html).toContain('class="panel space-y-4 p-5"')
  expect(html).toContain('class="field"')
  expect(html).toContain('class="btn btn-primary"')
})
