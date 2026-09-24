import { NextResponse } from "next/server"
import { setupAuth } from "@/lib/auth"
import { sqlite } from "@/lib/sqlite"
import {
  acquireSetupClaim,
  finishSetupClaim,
  releaseSetupClaim,
} from "@/lib/setup-claim"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  let input: { name?: unknown; email?: unknown; password?: unknown }
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const name = typeof input.name === "string" ? input.name.trim() : ""
  const email =
    typeof input.email === "string" ? input.email.trim().toLowerCase() : ""
  const password = typeof input.password === "string" ? input.password : ""
  if (!name || !email.includes("@") || password.length < 8) {
    return NextResponse.json(
      {
        error:
          "Enter a name, valid email address, and password of at least 8 characters.",
      },
      { status: 400 },
    )
  }

  const token = crypto.randomUUID()
  const claim = await acquireSetupClaim(sqlite, token)
  if (claim === "complete") {
    return NextResponse.json(
      { error: "Setup has already been completed. Please sign in." },
      { status: 409 },
    )
  }
  if (claim === "busy") {
    return NextResponse.json(
      { error: "Setup is already in progress. Please try again shortly." },
      { status: 409 },
    )
  }

  try {
    const signup = await setupAuth.api.signUpEmail({
      body: { name, email, password },
      asResponse: true,
    })
    if (!signup.ok) {
      await releaseSetupClaim(sqlite, token)
      return signup
    }
    if (!(await finishSetupClaim(sqlite, token)))
      return NextResponse.json(
        {
          error:
            "Account created but setup finalization failed. Please sign in.",
        },
        { status: 500 },
      )
    return signup
  } catch (error) {
    await releaseSetupClaim(sqlite, token)
    console.error("Initial account setup failed:", error)
    return NextResponse.json(
      { error: "Unable to create the first account. Please try again." },
      { status: 500 },
    )
  }
}
