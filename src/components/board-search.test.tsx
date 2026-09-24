import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { BoardSearch } from "./board-search"

const apps = [
  { id: "plex", name: "Plex", url: "https://plex.example", iconSlug: "plex" },
  {
    id: "sonarr",
    name: "Sonarr",
    url: "https://sonarr.example",
    iconSlug: "sonarr",
  },
]

describe("BoardSearch", () => {
  it("renders a sticky header with the board name, search field, and admin link", () => {
    const html = renderToStaticMarkup(
      <BoardSearch boardName="Home" apps={apps} />,
    )
    expect(html).toContain("sticky")
    expect(html).toContain("Home")
    expect(html).toContain('id="board-search"')
    expect(html).toContain('href="/admin"')
  })

  it("renders each app as a new-tab tile in manual order", () => {
    const html = renderToStaticMarkup(
      <BoardSearch boardName="Home" apps={apps} />,
    )
    const hrefs = [...html.matchAll(/<a[^>]*href="(https:[^"]+)"[^>]*>/g)].map(
      (match) => match[1],
    )
    expect(hrefs).toEqual(["https://plex.example", "https://sonarr.example"])
    expect(html).toContain('target="_blank"')
    expect(html).toContain('rel="noreferrer"')
    expect(html).toContain('src="/icons/plex"')
    expect(html).toContain("Plex")
    expect(html).toContain("aspect-square")
    expect(html).toContain("repeat(auto-fit,8.5rem)")
  })

  it("keeps the search field visible on an empty board", () => {
    const html = renderToStaticMarkup(
      <BoardSearch boardName="Empty" apps={[]} />,
    )
    expect(html).toContain('id="board-search"')
    expect(html).toContain("This board is empty")
  })

  it("does not advertise the removed custom keyboard shortcuts", () => {
    const html = renderToStaticMarkup(
      <BoardSearch boardName="Home" apps={apps} />,
    )
    expect(html).not.toMatch(/escape|ctrl|cmd|arrow/i)
  })
})
