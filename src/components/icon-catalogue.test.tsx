import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  filterIcons,
  flattenCatalogue,
  IconCatalogueSearch,
  iconCatalogueRequestKey,
  iconPreviewUrl,
  type Catalogue,
} from "./icon-catalogue"

const catalogue: Catalogue = {
  plex: { base: "png", aliases: ["plex-media-server"] },
  jellyfin: { base: "svg" },
}

const published: Catalogue = {
  github: {
    base: "svg",
    aliases: ["git-hub"],
    colors: { dark: "github", light: "github-light" },
  },
  plex: { base: "png", colors: { light: "plex-light" } },
  "plex-light": { base: "png" },
  jellyfin: { base: "svg" },
}

describe("flattenCatalogue", () => {
  it("lists nested colour slugs as selectable entries inheriting base and aliases", () => {
    const flat = flattenCatalogue(published)
    expect(Object.keys(flat)).toEqual([
      "github",
      "github-light",
      "plex",
      "plex-light",
      "jellyfin",
    ])
    expect(flat["github-light"]).toEqual({ base: "svg", aliases: ["git-hub"] })
    expect(flat.github).not.toHaveProperty("colors")
    expect(iconPreviewUrl(flat["github-light"], "github-light")).toBe(
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/svg/github-light.svg",
    )
  })

  it("keeps an explicit top-level entry over a repeated colour slug", () => {
    expect(flattenCatalogue(published)["plex-light"]).toEqual({ base: "png" })
  })

  it("finds variants by the parent alias", () => {
    expect(
      filterIcons(flattenCatalogue(published), "git-hub").map(([s]) => s),
    ).toEqual(["github", "github-light"])
  })

  it("leaves ordinary entries unchanged", () => {
    expect(flattenCatalogue(catalogue)).toEqual(catalogue)
  })
})

describe("icon catalogue helpers", () => {
  it("filters by slug and alias", () => {
    expect(filterIcons(catalogue, "plex").map(([slug]) => slug)).toEqual([
      "plex",
    ])
    expect(filterIcons(catalogue, "media").map(([slug]) => slug)).toEqual([
      "plex",
    ])
    expect(filterIcons(catalogue, "nope")).toEqual([])
  })

  it("builds a CDN preview URL", () => {
    expect(iconPreviewUrl({ base: "png" }, "plex")).toBe(
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
    )
  })

  it("changes the request key after a retry so the catalogue is re-fetched", () => {
    const before = iconCatalogueRequestKey(true, null, 0)
    const after = iconCatalogueRequestKey(true, null, 1)
    expect(before).not.toBeNull()
    expect(after).not.toBe(before)
  })

  it("does not request the catalogue when inactive or already loaded", () => {
    expect(iconCatalogueRequestKey(false, null, 0)).toBeNull()
    expect(iconCatalogueRequestKey(true, catalogue, 0)).toBeNull()
  })
})

describe("IconCatalogueSearch", () => {
  it("renders matching icons and marks the selected one", () => {
    const html = renderToStaticMarkup(
      <IconCatalogueSearch
        catalogue={catalogue}
        error=""
        onRetry={() => {}}
        value="plex"
        onSelect={() => {}}
      />,
    )
    expect(html).toContain("plex")
    expect(html).toContain('aria-pressed="true"')
  })

  it("offers a retry when the catalogue failed to load", () => {
    const html = renderToStaticMarkup(
      <IconCatalogueSearch
        catalogue={null}
        error="Could not load the icon catalogue."
        onRetry={() => {}}
        value=""
        onSelect={() => {}}
      />,
    )
    expect(html).toContain("Could not load the icon catalogue.")
    expect(html).toContain("Retry")
  })

  it("keeps the icon grid bordered and about three rows tall", () => {
    const manyIcons = Object.fromEntries(
      Array.from({ length: 13 }, (_, index) => [
        `icon-${index}`,
        { base: "png" },
      ]),
    ) as Catalogue
    const html = renderToStaticMarkup(
      <IconCatalogueSearch
        embedded
        catalogue={manyIcons}
        error=""
        onRetry={() => {}}
        value=""
        onSelect={() => {}}
      />,
    )
    expect(html).toContain("max-h-[11.5rem]")
    expect(html).toContain("border border-line p-2")
    expect(html).not.toContain("more icons")
    expect(html).toContain('class="bg-background px-3 pb-3"')
  })
})
