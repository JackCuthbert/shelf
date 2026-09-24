import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session)
    return NextResponse.json(
      { error: "Sign in to change your email." },
      { status: 401 },
    )

  let input: { email?: unknown; currentPassword?: unknown }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const currentPassword =
    typeof input.currentPassword === "string" ? input.currentPassword : ""
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !currentPassword) {
    return NextResponse.json(
      { error: "Enter a valid email address and your current password." },
      { status: 400 },
    )
  }

  try {
    await auth.api.verifyPassword({
      body: { password: currentPassword },
      headers: request.headers,
    })
  } catch {
    return NextResponse.json(
      { error: "Current password is incorrect." },
      { status: 401 },
    )
  }

  try {
    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { email },
      select: { email: true },
    })
    return NextResponse.json({ email: user.email })
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "That email address is already in use." },
        { status: 409 },
      )
    }
    throw error
  }
}
