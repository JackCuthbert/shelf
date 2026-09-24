import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"

export type AppIconReference = {
  iconSource: string
  iconSlug: string | null
  iconHash?: string | null
}

/** The file base (without extension) served from `/icons/` for an app. */
export function iconKey(app: AppIconReference): string {
  if (app.iconSource === "url" && app.iconHash) return app.iconHash
  return app.iconSlug ?? PLACEHOLDER_ICON_SLUG
}
