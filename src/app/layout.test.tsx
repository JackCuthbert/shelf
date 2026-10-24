import { expect, it } from "vitest"
import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { vi } from "vitest"
vi.mock("next/font/google", () => ({ IBM_Plex_Mono: () => ({ variable: "" }) }))
import { metadata } from "./layout"

it("declares the local light and dark favicons in browser preference order", async () => {
  expect(metadata.icons).toEqual({
    icon: [
      { url: "/brand/shelf-icon-light.svg", type: "image/svg+xml" },
      {
        url: "/brand/shelf-icon-dark.svg",
        type: "image/svg+xml",
        media: "(prefers-color-scheme: dark)",
      },
    ],
  })

  for (const file of ["shelf-icon-light.svg", "shelf-icon-dark.svg"]) {
    const svg = await readFile(resolve("public/brand", file), "utf8")
    expect(svg).toMatch(/<svg\b/)
  }
})
