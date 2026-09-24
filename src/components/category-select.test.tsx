import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { CategorySelect } from "./category-select"

it("renders an enabled trigger by default", () => {
  const html = renderToStaticMarkup(
    <CategorySelect
      value={null}
      categories={[{ id: "movies", title: "Movies" }]}
      label="Category"
      onChange={() => {}}
    />,
  )
  expect(html).toContain('aria-label="Category"')
  expect(html).not.toContain('disabled=""')
})

it("renders a disabled trigger when disabled", () => {
  const html = renderToStaticMarkup(
    <CategorySelect
      value="movies"
      categories={[{ id: "movies", title: "Movies" }]}
      label="Category"
      disabled
      onChange={() => {}}
    />,
  )
  expect(html).toMatch(/<button[^>]* disabled=""[^>]*>/)
})
