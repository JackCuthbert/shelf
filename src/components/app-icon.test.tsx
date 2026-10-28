import { renderToStaticMarkup } from "react-dom/server"
import { expect, it } from "vitest"
import { AppIcon } from "@/components/app-icon"

const base = { iconSource: "dashboard", iconSlug: "plex" }

it("renders only the light image for a legacy app", () => {
  const html = renderToStaticMarkup(
    <AppIcon app={base} alt="" className="size-full object-contain" />,
  )
  expect(html).toBe(
    '<picture class="contents"><img src="/icons/plex" alt="" class="size-full object-contain"/></picture>',
  )
})

it("renders only the light image when both keys match", () => {
  const html = renderToStaticMarkup(
    <AppIcon
      app={{ ...base, darkIconSource: "dashboard", darkIconSlug: "plex" }}
      alt=""
    />,
  )
  expect(html).not.toContain("<source")
})

it("adds a dark source for distinct catalogue and custom keys", () => {
  const html = renderToStaticMarkup(
    <AppIcon
      app={{
        iconSource: "url",
        iconSlug: null,
        iconHash: "light-hash",
        darkIconSource: "url",
        darkIconHash: "dark-hash",
      }}
      alt="Plex"
    />,
  )
  expect(html).toBe(
    '<picture class="contents"><source media="(prefers-color-scheme: dark)" srcSet="/icons/dark-hash" class="hidden"/><img src="/icons/light-hash" alt="Plex"/></picture>',
  )
  expect(
    renderToStaticMarkup(
      <AppIcon
        app={{
          ...base,
          darkIconSource: "dashboard",
          darkIconSlug: "plex-dark",
        }}
        alt=""
      />,
    ),
  ).toContain('srcSet="/icons/plex-dark"')
})
