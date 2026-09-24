import { describe, expect, it } from "vitest"
import { PLACEHOLDER_ICON_SLUG } from "@/lib/placeholder-icon"
import { GET } from "./route"

function context(slug: string) {
  return { params: Promise.resolve({ slug }) } as never
}

describe("GET /icons/[slug]", () => {
  it("serves the bundled placeholder as an SVG without touching the icon directory", async () => {
    const response = await GET(
      new Request(`http://localhost/icons/${PLACEHOLDER_ICON_SLUG}`),
      context(PLACEHOLDER_ICON_SLUG),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/svg+xml")
    expect(await response.text()).toContain("<svg")
  })

  it("returns 404 for an invalid slug", async () => {
    const response = await GET(
      new Request("http://localhost/icons/Not_A_Slug"),
      context("Not_A_Slug"),
    )
    expect(response.status).toBe(404)
  })
})
