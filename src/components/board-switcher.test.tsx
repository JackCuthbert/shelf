import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { BoardSwitcher, BoardSwitcherOptions } from "./board-switcher"

const boards = [
  {
    id: "one",
    nanoid: "home-id",
    name: "Home",
    ownerName: "Jack",
    ownerId: "jack",
  },
  {
    id: "two",
    nanoid: "media-id",
    name: "Media",
    ownerName: "Alex",
    ownerId: "alex",
  },
]

it("keeps the two-line header as a single dropdown trigger", () => {
  const html = renderToStaticMarkup(
    <BoardSwitcher
      boardName="Home"
      boardNanoid="home-id"
      boards={boards}
      initialDefaultBoardId="one"
    />,
  )
  expect(html).toContain("Shelf")
  expect(html).toContain("Home")
  expect(html).toContain("Choose board")
  expect(html).toContain("hover:bg-surface-alt")
  expect(html).toContain("data-[popup-open]:bg-surface-alt")
  expect(html).toContain("-ml-2")
})

it("shows every board and owner without default controls", () => {
  const html = renderToStaticMarkup(
    <BoardSwitcherOptions
      boards={boards}
      currentBoardNanoid="media-id"
      defaultBoardId="one"
    />,
  )
  expect(html).toContain("Jack")
  expect(html).toContain("Alex")
  expect(html).toContain('href="/board/home-id"')
  expect(html).toContain('aria-current="page"')
  expect(html).toContain('aria-disabled="true"')
  expect(html).toContain('aria-label="Default board"')
  expect(html).not.toContain("Set as default")
  expect(html.match(/<svg/g)).toHaveLength(1)
})
