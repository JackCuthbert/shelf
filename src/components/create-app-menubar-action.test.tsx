import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

const formProps = vi.hoisted(() => [] as Record<string, unknown>[])
vi.mock("@/components/trpc-provider", () => ({
  trpc: { boards: { list: { useQuery: () => ({ data: [] }) } } },
}))
vi.mock("@/components/app-form-dialog", () => ({
  AppFormDialog: (props: Record<string, unknown>) => {
    formProps.push(props)
    return null
  },
}))

import { CreateAppMenubarAction } from "@/components/create-app-menubar-action"

it("passes dark icon references through to the app form", () => {
  const existingApps = [
    {
      id: "a1",
      name: "Plex",
      url: "https://plex.example",
      iconSource: "dashboard",
      iconSlug: "plex",
      iconHash: null,
      darkIconSource: "url",
      darkIconSlug: null,
      darkIconHash: "dark-hash",
    },
  ]
  renderToStaticMarkup(
    <CreateAppMenubarAction
      context="public-board"
      existingApps={existingApps}
      onAssignExisting={async () => {}}
    />,
  )
  expect(formProps.at(-1)?.existingApps).toBe(existingApps)
})
