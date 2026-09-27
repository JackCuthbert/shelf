import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function resolveApiUser(
  headers: Headers,
): Promise<{ id: string } | null> {
  const authorization = headers.get("authorization")
  const match = authorization?.match(/^Bearer ([^\s]+)$/i)
  if (!match) return null
  try {
    const result = await auth.api.verifyApiKey({ body: { key: match[1] } })
    if (!result.valid || !result.key?.referenceId) return null
    const user = await prisma.user.findUnique({
      where: { id: result.key.referenceId },
      select: { id: true },
    })
    return user ? { id: user.id } : null
  } catch {
    return null
  }
}
