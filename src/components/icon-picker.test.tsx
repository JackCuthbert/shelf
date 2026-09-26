import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { IconPicker } from "./icon-picker"

describe("IconPicker", () => {
  it("shows the image URL field and live preview in url mode", () => {
    const html = renderToStaticMarkup(
      <IconPicker
        value={{ source: "url", slug: "", url: "https://images.home/a.png" }}
        onChange={() => {}}
      />,
    )
    expect(html).toContain('type="url"')
    expect(html).toContain('value="https://images.home/a.png"')
    expect(html).toContain('src="https://images.home/a.png"')
  })

  it("collapses the picker when an icon is selected", () => {
    const html = renderToStaticMarkup(
      <IconPicker
        value={{ source: "dashboard", slug: "plex", url: "" }}
        cachedSlug="plex"
        onChange={() => {}}
      />,
    )
    expect(html).toContain("Selected icon")
    expect(html).toContain('src="/icons/plex"')
    expect(html).toContain("Change icon")
    expect(html).not.toContain("Search Dashboard Icons")
    expect(html).not.toContain(">Close</span>")
    expect(html).not.toContain('type="url"')
  })

  it("opens the picker when no icon is selected", () => {
    const html = renderToStaticMarkup(
      <IconPicker
        value={{ source: "dashboard", slug: "", url: "" }}
        onChange={() => {}}
      />,
    )
    expect(html).toContain("Select icon")
    expect(html).toContain("Search Dashboard Icons")
    expect(html).not.toContain("Change icon")
  })
})
