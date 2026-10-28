import { renderToStaticMarkup } from "react-dom/server"
import { expect, it, vi } from "vitest"

const dialogProps = vi.hoisted(() => [] as Record<string, unknown>[])
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: () => {} }),
}))
vi.mock("@/components/app-form-dialog", () => ({
  AppFormDialog: (props: Record<string, unknown>) => {
    dialogProps.push(props)
    return null
  },
}))

import { AppDetailEditAction } from "./app-detail-edit-action"

it("hands the saved app record to the edit dialog unmodified", () => {
  const app = {
    id: "plex",
    name: "Plex",
    description: "",
    url: "https://plex.example",
    iconSource: "url",
    iconSlug: null,
    customIconUrl: "https://plex.example/light.png",
    iconHash: "light-hash",
    darkIconSource: "dashboard",
    darkIconSlug: "plex",
    darkCustomIconUrl: null,
    darkIconHash: "dark-hash",
    statusChecksEnabled: true,
  }
  renderToStaticMarkup(<AppDetailEditAction app={app} />)
  expect(dialogProps.at(-1)?.app).toBe(app)
})
