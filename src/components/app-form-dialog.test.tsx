import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({ mutate: () => {}, isPending: false })
  return {
    trpc: {
      boards: { assign: { useMutation } },
      apps: {
        create: { useMutation },
        update: { useMutation },
      },
    },
  }
})

vi.mock("@/components/modal", async () => {
  const { createElement } = await import("react")
  return {
    ModalContent: ({ children }: { children?: unknown }) =>
      createElement("div", null, children as never),
    ConfirmContent: () => null,
  }
})

import {
  AppFormDialog,
  appDraftPayload,
  draftFromApp,
  draftIcon,
  withDraftIcon,
} from "./app-form-dialog"

const app = {
  id: "app00001",
  name: "Plex",
  description: "",
  url: "https://plex.example",
  iconSource: "dashboard",
  iconSlug: "plex",
  customIconUrl: null,
  statusChecksEnabled: true,
}

function statusCheckbox(html: string) {
  return html.includes('data-checked=""') ? "checked" : "unchecked"
}

it("enables status checks by default when creating an app", () => {
  const html = renderToStaticMarkup(
    <AppFormDialog open onOpenChange={() => {}} />,
  )
  expect(html).toContain("Status checks")
  expect(html).toContain("Check whether this app is responding.")
  expect(statusCheckbox(html)).toBe("checked")
})

it("uses the saved status checks value when editing an app", () => {
  expect(draftFromApp(app).statusChecksEnabled).toBe(true)
  expect(draftFromApp({ ...app, statusChecksEnabled: false })).toMatchObject({
    statusChecksEnabled: false,
  })
  expect(draftFromApp(null).statusChecksEnabled).toBe(true)
})

it("includes the status checks value in the saved payload", () => {
  const draft = {
    name: "Plex",
    description: "",
    url: "https://plex.example",
    iconSource: "dashboard" as const,
    iconSlug: "plex",
    iconUrl: "",
    darkIconSource: "dashboard" as const,
    darkIconSlug: "plex",
    darkIconUrl: "",
    statusChecksEnabled: false,
  }
  expect(appDraftPayload(draft)).toMatchObject({
    iconSlug: "plex",
    statusChecksEnabled: false,
  })
  expect(
    appDraftPayload({
      ...draft,
      iconSource: "url",
      iconSlug: "",
      iconUrl: "https://icons.example/plex.png",
    }),
  ).toMatchObject({
    iconUrl: "https://icons.example/plex.png",
    statusChecksEnabled: false,
  })
})

it("initializes a legacy app with its light icon in both slots", () => {
  const draft = draftFromApp({ ...app, darkIconSource: null })
  expect(draftIcon(draft, "dark")).toEqual(draftIcon(draft, "light"))
  expect(appDraftPayload(draft).darkIcon).toEqual({
    iconSource: "dashboard",
    iconSlug: "plex",
  })
})

it("loads a saved dark icon into the dark slot", () => {
  const draft = draftFromApp({
    ...app,
    darkIconSource: "url",
    darkIconSlug: null,
    darkCustomIconUrl: "https://icons.example/dark.png",
  })
  expect(draftIcon(draft, "light").slug).toBe("plex")
  expect(draftIcon(draft, "dark")).toEqual({
    source: "url",
    slug: "",
    url: "https://icons.example/dark.png",
  })
  expect(appDraftPayload(draft)).toMatchObject({
    iconSource: "dashboard",
    iconSlug: "plex",
    darkIcon: { iconSource: "url", iconUrl: "https://icons.example/dark.png" },
  })
})

it("keeps the two slot drafts independent and cloned on copy", () => {
  const draft = draftFromApp(app)
  const edited = withDraftIcon(draft, "dark", {
    source: "url",
    slug: "kept",
    url: "https://icons.example/x.png",
  })
  expect(draftIcon(edited, "light")).toEqual(draftIcon(draft, "light"))
  expect(draftIcon(edited, "dark")).toEqual({
    source: "url",
    slug: "kept",
    url: "https://icons.example/x.png",
  })
  const copied = withDraftIcon(edited, "light", {
    ...draftIcon(edited, "dark"),
  })
  expect(draftIcon(copied, "light")).toEqual(draftIcon(copied, "dark"))
  const changed = withDraftIcon(copied, "dark", {
    ...draftIcon(copied, "dark"),
    url: "",
  })
  expect(draftIcon(changed, "light").url).toBe("https://icons.example/x.png")
})

it("always includes an explicit dark icon for a new app", () => {
  expect(appDraftPayload(draftFromApp(null))).toHaveProperty("darkIcon")
})

it("renders both slots when editing", () => {
  const html = renderToStaticMarkup(
    <AppFormDialog open onOpenChange={() => {}} app={app} />,
  )
  expect(html).toContain("Light mode")
  expect(html).toContain("Dark mode")
})
