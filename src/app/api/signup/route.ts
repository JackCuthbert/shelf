import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { signupEnabled } from "@/lib/account-policy"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  if (!signupEnabled(process.env.ENABLE_SIGNUP))
    return NextResponse.json({ error: "Sign-up is disabled." }, { status: 403 })
  const result = await auth.handler(
    new Request(new URL("/api/auth/sign-up/email", request.url), {
      method: "POST",
      headers: request.headers,
      body: await request.text(),
    }),
  )
  return result
}
