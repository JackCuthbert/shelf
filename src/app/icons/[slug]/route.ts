import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { iconSlugSchema } from "@/lib/app-validation"
import { iconDirectory } from "@/lib/icon-cache"

export const runtime = "nodejs"

export async function GET(
  _request: Request,
  context: RouteContext<"/icons/[slug]">,
) {
  const { slug } = await context.params
  if (!iconSlugSchema.safeParse(slug).success)
    return new Response("Not found", { status: 404 })
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
