import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"

export type AppIconReference = {
  iconSource: string
  iconSlug: string | null
  iconHash?: string | null
  darkIconSource?: string | null
  darkIconSlug?: string | null
  darkIconHash?: string | null
}

/** The file base (without extension) served from `/icons/` for an app. */
export function iconKey(
  app: AppIconReference,
  mode: "light" | "dark" = "light",
): string {
  if (mode === "dark" && app.darkIconSource) {
    if (app.darkIconSource === "url" && app.darkIconHash)
      return app.darkIconHash
    return app.darkIconSlug ?? PLACEHOLDER_ICON_SLUG
  }
  if (app.iconSource === "url" && app.iconHash) return app.iconHash
  return app.iconSlug ?? PLACEHOLDER_ICON_SLUG
}
