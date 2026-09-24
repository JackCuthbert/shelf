import { iconSlugSchema } from "./app-validation"

const DASHBOARD_ICONS_PATTERN =
  /(?:homarr-labs|walkxcode)\/dashboard-icons(?:@[^/]+)?\/(?:png|svg)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(?:png|svg)(?:[?#]|$)/i

export function detectIconSlug(iconUrl: string): string | null {
  const match = DASHBOARD_ICONS_PATTERN.exec(iconUrl)
  if (!match) return null
  const slug = match[1].toLowerCase()
  return iconSlugSchema.safeParse(slug).success ? slug : null
}
