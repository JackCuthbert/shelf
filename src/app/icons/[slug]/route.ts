import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { iconSlugSchema } from "@/lib/app-validation"
import { iconDirectory } from "@/lib/icon-cache"
import {
  PLACEHOLDER_ICON_SLUG,
  PLACEHOLDER_ICON_SVG,
} from "@/lib/placeholder-icon"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: RouteContext<"/icons/[slug]">,
) {
  const { slug } = await context.params
  if (!iconSlugSchema.safeParse(slug).success)
    return new Response("Not found", { status: 404 })
  if (slug === PLACEHOLDER_ICON_SLUG)
    return new Response(PLACEHOLDER_ICON_SVG, {
      headers: {
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  try {
    const image = await readFile(join(iconDirectory, `${slug}.png`))
    return new Response(image, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch {
    return new Response("Not found", { status: 404 })
  }
}
