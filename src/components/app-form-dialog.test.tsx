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

import { AppFormDialog, appDraftPayload, draftFromApp } from "./app-form-dialog"

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
