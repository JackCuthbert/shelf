"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { authClient } from "@/lib/auth-client"

export async function updateDisplayName(name: string) {
  try {
    const result = await authClient.updateUser({ name: name.trim() })
    return result.error ? "Unable to update your name." : null
  } catch {
    return "Unable to update your name. Check your connection and try again."
  }
}

export async function updatePassword(
  currentPassword: string,
  newPassword: string,
) {
  try {
    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    })
    return result.error
      ? "Password change failed. Check your current password and try again."
      : null
  } catch {
    return "Unable to change your password. Check your connection and try again."
  }
}

export function AccountSettings({
  name,
  email,
  oidc,
}: {
  name: string
  email: string
  oidc?: { name: string; connected: boolean }
}) {
  const [nameState, setNameState] = useState({
    pending: false,
    message: "",
    error: false,
  })
  const [emailState, setEmailState] = useState({
    pending: false,
    message: "",
    error: false,
  })
  const [passwordState, setPasswordState] = useState({
    pending: false,
    message: "",
    error: false,
  })
  const [oidcState, setOidcState] = useState({ pending: false, message: "" })

  async function connectOidc() {
    setOidcState({ pending: true, message: "" })
    try {
      const result = await authClient.linkSocial({
        provider: "oidc",
        callbackURL: "/admin/account",
        errorCallbackURL: "/admin/account",
      })
      if (result.error || !result.data?.url) {
        setOidcState({
          pending: false,
          message: "Unable to start the identity provider connection.",
        })
        return
      }
      window.location.assign(result.data.url)
    } catch {
      setOidcState({
        pending: false,
        message:
          "Unable to connect the identity provider. Check your connection.",
      })
    }
  }

  async function saveName(values: Record<string, unknown>) {
    setNameState({ pending: true, message: "", error: false })
    const error = await updateDisplayName(String(values.name ?? ""))
    if (!error) {
      window.dispatchEvent(
        new CustomEvent("account-name-updated", {
          detail: String(values.name ?? "").trim(),
        }),
      )
    }
    setNameState({
      pending: false,
      message: error ?? "Name updated.",
      error: Boolean(error),
    })
  }

  async function saveEmail(values: Record<string, unknown>) {
    setEmailState({ pending: true, message: "", error: false })
    try {
      const response = await fetch("/api/account/email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          currentPassword: values.currentPassword,
        }),
      })
      const result = await response.json()
      setEmailState({
        pending: false,
        message: response.ok
          ? "Email updated."
          : (result.error ?? "Unable to update your email."),
        error: !response.ok,
      })
    } catch {
      setEmailState({
        pending: false,
        message:
          "Unable to update your email. Check your connection and try again.",
        error: true,
      })
    }
  }

  async function savePassword(values: Record<string, unknown>, event: Event) {
    setPasswordState({ pending: true, message: "", error: false })
    const error = await updatePassword(
      String(values.currentPassword ?? ""),
      String(values.newPassword ?? ""),
    )
    if (error) {
      setPasswordState({
        pending: false,
        message: error,
        error: true,
      })
      return
    }
    ;(event.target as HTMLFormElement).reset()
    setPasswordState({
      pending: false,
      message: "Password updated. Other sessions have been signed out.",
      error: false,
    })
  }

  const status = (state: { message: string; error: boolean }) =>
    state.message && (
      <p
        role={state.error ? "alert" : "status"}
        className={state.error ? "text-sm text-danger" : "text-sm text-muted"}
      >
        {state.message}
      </p>
    )
  return (
    <div className="space-y-5">
      <section className="panel space-y-4 p-5">
        <h2 className="text-lg font-semibold">Display name</h2>
        <Form onFormSubmit={saveName} className="space-y-4">
          <Field.Root name="name" className="space-y-2">
            <Field.Label className="text-xs text-muted">Name</Field.Label>
            <Input
              className="field"
              defaultValue={name}
              autoComplete="name"
              required
            />
          </Field.Root>
          {status(nameState)}
          <Button type="submit" className="btn" disabled={nameState.pending}>
            {nameState.pending ? "Saving…" : "Save name"}
          </Button>
        </Form>
      </section>
      <section className="panel space-y-4 p-5">
        <h2 className="text-lg font-semibold">Email address</h2>
        <Form onFormSubmit={saveEmail} className="space-y-4">
          <Field.Root name="email" className="space-y-2">
            <Field.Label className="text-xs text-muted">Email</Field.Label>
            <Input
              className="field"
              type="email"
              defaultValue={email}
              autoComplete="email"
              required
            />
          </Field.Root>
          <PasswordField name="currentPassword" label="Current password" />
          {status(emailState)}
          <Button type="submit" className="btn" disabled={emailState.pending}>
            {emailState.pending ? "Saving…" : "Save email"}
          </Button>
        </Form>
      </section>
      <section className="panel space-y-4 p-5">
        <h2 className="text-lg font-semibold">Password</h2>
        <Form
          onFormSubmit={(values, event) => savePassword(values, event.event)}
          className="space-y-4"
        >
          <PasswordField name="currentPassword" label="Current password" />
          <PasswordField
            name="newPassword"
            label="New password"
            minLength={8}
          />
          {status(passwordState)}
          <Button
            type="submit"
            className="btn"
            disabled={passwordState.pending}
          >
            {passwordState.pending ? "Saving…" : "Save password"}
          </Button>
        </Form>
      </section>
      {oidc && (
        <section className="panel space-y-3 p-5">
          <h2 className="text-lg font-semibold">
            Connected identity providers
          </h2>
          {oidc.connected ? (
            <p className="text-sm text-muted">{oidc.name} connected</p>
          ) : (
            <>
              <p className="text-sm text-muted">
                Connect {oidc.name} to sign in to this account with your
                identity provider.
              </p>
              <Button
                type="button"
                className="btn"
                disabled={oidcState.pending}
                onClick={connectOidc}
              >
                {oidcState.pending ? "Connecting…" : `Connect ${oidc.name}`}
              </Button>
            </>
          )}
          {oidcState.message && (
            <p role="alert" className="text-sm text-danger">
              {oidcState.message}
            </p>
          )}
        </section>
      )}
    </div>
  )
}

function PasswordField({
  name,
  label,
  minLength,
}: {
  name: string
  label: string
  minLength?: number
}) {
  return (
    <Field.Root name={name} className="space-y-2">
      <Field.Label className="text-xs text-muted">{label}</Field.Label>
      <Input
        className="field"
        type="password"
        autoComplete={
          name === "newPassword" ? "new-password" : "current-password"
        }
        required
        minLength={minLength}
      />
    </Field.Root>
  )
}
