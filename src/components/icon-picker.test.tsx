import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  IconPicker,
  iconSelectionPreview,
  type IconSelection,
  type IconSlot,
} from "./icon-picker"

const plex: IconSelection = { source: "dashboard", slug: "plex", url: "" }
const empty: IconSelection = { source: "dashboard", slug: "", url: "" }

function render(
  values: Record<IconSlot, IconSelection>,
  extra: Partial<Parameters<typeof IconPicker>[0]> = {},
) {
  return renderToStaticMarkup(
    <IconPicker
      values={values}
      slot="light"
      onSlotChange={() => {}}
      onChange={() => {}}
      {...extra}
    />,
  )
}

describe("IconPicker", () => {
  it("shows two labelled slots with the active one pressed", () => {
    const html = render({ light: plex, dark: { ...plex, slug: "plex-light" } })
    expect(html).toContain("Light mode")
    expect(html).toContain("Dark mode")
    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain("Editing light mode")
    expect(html).toContain("Use for dark mode →")
    expect(html).toContain("plex-light")
    expect(html).toContain("bg-[#eef2e7]")
    expect(html).toContain("bg-[#191f17]")
  })

  it("edits the dark slot and offers the copy back to light", () => {
    const html = render({ light: plex, dark: plex }, { slot: "dark" })
    expect(html).toContain("Editing dark mode")
    expect(html).toContain("← Use for light mode")
  })

  it("shows the image URL field and live preview in url mode", () => {
    const url = {
      source: "url" as const,
      slug: "",
      url: "https://images.home/a.png",
    }
    const html = render({ light: url, dark: url })
    expect(html).toContain('type="url"')
    expect(html).toContain('value="https://images.home/a.png"')
    expect(html).toContain('src="https://images.home/a.png"')
  })

  it("uses the cached key for an unchanged saved selection", () => {
    const url = {
      source: "url" as const,
      slug: "",
      url: "https://images.home/a.png",
    }
    const html = render(
      { light: plex, dark: url },
      {
        saved: {
          light: { selection: plex, key: "plex" },
          dark: { selection: url, key: "abc123hash" },
        },
      },
    )
    expect(html).toContain('src="/icons/plex"')
    expect(html).toContain('src="/icons/abc123hash"')
    expect(html).not.toContain('src="https://images.home/a.png"')
  })

  it("collapses the picker when an icon is selected", () => {
    const html = render({ light: plex, dark: plex })
    expect(html).toContain("Selected icon")
    expect(html).toContain("Change icon")
    expect(html).not.toContain("Search Dashboard Icons")
  })

  it("opens the picker when the active slot has no icon", () => {
    const html = render({ light: empty, dark: plex })
    expect(html).toContain("Select icon")
    expect(html).toContain("Search Dashboard Icons")
    expect(html).not.toContain("Change icon")
  })
})

describe("iconSelectionPreview", () => {
  const catalogue = { plex: { base: "png" } }
  it("ignores the unused field when switching source and back", () => {
    const url = {
      source: "url" as const,
      slug: "",
      url: "https://a.home/a.png",
    }
    expect(
      iconSelectionPreview(
        { ...plex, url: "https://typed.home/x.png" },
        { selection: plex, key: "plex" },
        catalogue,
      ),
    ).toBe("/icons/plex")
    expect(
      iconSelectionPreview(
        { ...url, slug: "plex" },
        { selection: url, key: "hash1" },
        catalogue,
      ),
    ).toBe("/icons/hash1")
  })

  it("prefers the cached key only for the unchanged selection", () => {
    const saved = { selection: plex, key: "plex" }
    expect(iconSelectionPreview(plex, saved, catalogue)).toBe("/icons/plex")
    expect(
      iconSelectionPreview({ ...plex, slug: "jellyfin" }, saved, catalogue),
    ).toBeNull()
  })
  it("previews an unsaved slug from the catalogue", () => {
    expect(iconSelectionPreview(plex, undefined, catalogue)).toContain(
      "/png/plex.png",
    )
  })
})
