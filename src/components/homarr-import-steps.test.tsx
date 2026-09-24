import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { HomarrImportConnect } from "./homarr-import-connect"
import { HomarrImportReview } from "./homarr-import-review"
import type { ImportRow } from "@/lib/homarr-import"

const rows: ImportRow[] = [
  {
    key: "1",
    name: "Plex",
    description: "Movies",
    url: "https://plex.home/",
    iconUrl: "",
    iconSlug: "plex",
    importable: true,
    reason: null,
    selected: true,
  },
  {
    key: "2",
    name: "Editor",
    description: "",
    url: "vscode://file",
    iconUrl: "",
    iconSlug: "",
    importable: false,
    reason: "Homarr URL is not HTTP(S).",
    selected: false,
  },
]

const reviewProps = {
  rows,
  filter: "",
  onFilterChange: () => {},
  onToggleRow: () => {},
  onToggleAll: () => {},
  catalogue: null,
  catalogueError: "",
  onRetryCatalogue: () => {},
  openIconKey: null,
  onOpenIcon: () => {},
  onSelectIcon: () => {},
  failures: [],
  pending: false,
  onBack: () => {},
  onImport: () => {},
}

describe("HomarrImportConnect", () => {
  it("collects the address and API key", () => {
    const html = renderToStaticMarkup(
      <HomarrImportConnect
        baseUrl=""
        apiKey=""
        onBaseUrlChange={() => {}}
        onApiKeyChange={() => {}}
        error=""
        pending={false}
        onSubmit={() => {}}
      />,
    )
    expect(html).toContain('type="password"')
    expect(html).toContain("Connect")
  })
})

describe("HomarrImportReview", () => {
  it("shows importable and excluded rows with counts", () => {
    const html = renderToStaticMarkup(<HomarrImportReview {...reviewProps} />)
    expect(html).toContain("Plex")
    expect(html).toContain("Homarr URL is not HTTP(S).")
    expect(html).toContain("1 of 1 selected")
    expect(html).toContain("Import 1 app")
  })

  it("shows an empty state when Homarr returns no apps", () => {
    const html = renderToStaticMarkup(
      <HomarrImportReview {...reviewProps} rows={[]} />,
    )
    expect(html).toContain("No apps found in Homarr")
  })

  it("lists per-app failures after a partial import", () => {
    const html = renderToStaticMarkup(
      <HomarrImportReview
        {...reviewProps}
        failures={[{ name: "Plex", reason: "Could not download the icon." }]}
      />,
    )
    expect(html).toContain("Could not download the icon.")
  })
})
