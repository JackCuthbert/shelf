"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { LuLoader, LuLogIn, LuUserPlus } from "react-icons/lu"
import { authClient } from "@/lib/auth-client"

export function AccountForm({
  setup,
  signup,
  oidc,
}: {
  setup: boolean
  signup: boolean
  oidc?: { name: string }
}) {
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)
  const [signingUp, setSigningUp] = useState(false)

  async function continueOidc() {
    setPending(true)
    setError("")
    try {
      const result = await authClient.signIn.social({
        provider: "oidc",
        callbackURL: "/admin/boards",
        requestSignUp: signup && signingUp,
      })
      if (result.error || !result.data?.url) {
        setError("Unable to start OpenID Connect sign-in.")
        setPending(false)
        return
      }
      window.location.assign(result.data.url)
    } catch {
      setError("Unable to start OpenID Connect sign-in. Check your connection.")
      setPending(false)
    }
  }

  async function submit(values: Record<string, unknown>) {
    setPending(true)
    setError("")
    const email = String(values.email ?? "")
      .trim()
      .toLowerCase()
    const password = String(values.password ?? "")
    const name = String(values.name ?? "").trim()
    if (setup) {
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.error ?? "Setup failed.")
        setPending(false)
        return
      }
    } else if (signup && signingUp) {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      })
      const result = await response.json()
      if (!response.ok) {
        setError(result.message ?? result.error ?? "Sign-up failed.")
        setPending(false)
        return
      }
    } else {
      const result = await authClient.signIn.email({ email, password })
      if (result.error) {
        setError("Email or password is incorrect.")
        setPending(false)
        return
      }
    }
    location.assign("/admin/boards")
  }
  return (
    <Form onFormSubmit={submit} className="panel space-y-4 p-6">
      {(setup || (signup && signingUp)) && (
        <Field.Root name="name" className="space-y-2">
          <Field.Label className="text-xs text-muted">Name</Field.Label>
          <Input className="field" autoComplete="name" required />
          <Field.Error className="text-xs text-danger" />
        </Field.Root>
      )}
      <Field.Root name="email" className="space-y-2">
        <Field.Label className="text-xs text-muted">Email</Field.Label>
        <Input className="field" type="email" autoComplete="email" required />
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      <Field.Root name="password" className="space-y-2">
        <Field.Label className="text-xs text-muted">Password</Field.Label>
        <Input
          className="field"
          type="password"
          autoComplete={
            setup || signingUp ? "new-password" : "current-password"
          }
          minLength={8}
          required
        />
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      <Button
        type="submit"
        disabled={pending}
        className="btn btn-primary w-full"
      >
        {pending ? (
          <LuLoader aria-hidden className="size-4 animate-spin" />
        ) : setup || signingUp ? (
          <LuUserPlus aria-hidden className="size-4" />
        ) : (
          <LuLogIn aria-hidden className="size-4" />
        )}
        <span>
          {pending
            ? "Please wait…"
            : setup
              ? "Create account"
              : signingUp
                ? "Create account"
                : "Sign in"}
        </span>
      </Button>
      {!setup && oidc && (
        <Button
          type="button"
          disabled={pending}
          className="btn w-full"
          onClick={continueOidc}
        >
          {signingUp ? "Sign up with" : "Continue with"} {oidc.name}
        </Button>
      )}
      {!setup && signup && (
        <Button
          type="button"
          disabled={pending}
          className="w-full text-sm text-accent underline underline-offset-2"
          onClick={() => {
            setError("")
            setSigningUp(!signingUp)
          }}
        >
          {signingUp ? "Already have an account? Sign in" : "Sign up"}
        </Button>
      )}
    </Form>
  )
}
