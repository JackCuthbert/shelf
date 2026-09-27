"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { authClient } from "@/lib/auth-client"

type KeyRow = {
  id: string
  name: string | null
  createdAt: Date | string
  lastRequest: Date | string | null
}

const formatDate = (value: Date | string) =>
  new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(new Date(value))

export function ApiKeys({ keys: initialKeys }: { keys: KeyRow[] }) {
  const [keys, setKeys] = useState(initialKeys)
  const [createdKey, setCreatedKey] = useState("")
  const [message, setMessage] = useState("")
  const [pending, setPending] = useState(false)
  async function create(values: Record<string, unknown>) {
    setPending(true)
    setMessage("")
    try {
      const result = await authClient.apiKey.create({
        name: String(values.name ?? "").trim(),
      })
      if (result.error || !result.data) throw new Error()
      setKeys((previous) => [
        {
          id: result.data.id,
          name: result.data.name,
          createdAt: result.data.createdAt,
          lastRequest: null,
        },
        ...previous,
      ])
      setCreatedKey(result.data.key)
    } catch {
      setMessage("Unable to create API key.")
    } finally {
      setPending(false)
    }
  }
  async function revoke(id: string) {
    if (
      !window.confirm("Revoke this API key? Clients using it will lose access.")
    )
      return
    const result = await authClient.apiKey.delete({ keyId: id })
    if (result.error) setMessage("Unable to revoke API key.")
    else setKeys((previous) => previous.filter((key) => key.id !== id))
  }
  return (
    <section className="panel space-y-4 p-5" aria-labelledby="api-keys-title">
      <h2 id="api-keys-title" className="text-lg font-semibold">
        API keys
      </h2>
      <p className="text-sm text-muted">
        Agents can set up boards and apps for you. Give an agent an API key and
        the{" "}
        <a
          href="/api/v1/openapi.json"
          className="text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
        >
          OpenAPI specification
        </a>{" "}
        to get started.
      </p>
      <Form onFormSubmit={create} className="space-y-3">
        <Field.Root name="name" className="space-y-2">
          <Field.Label className="text-xs text-muted">Key name</Field.Label>
          <Input
            className="field"
            required
            maxLength={80}
            autoComplete="off"
            placeholder="Key name"
          />
        </Field.Root>
        <Button type="submit" className="btn btn-primary" disabled={pending}>
          {pending ? "Creating…" : "Create key"}
        </Button>
      </Form>
      {message && (
        <p
          role="alert"
          className="border border-danger bg-surface p-3 text-sm text-danger"
        >
          {message}
        </p>
      )}
      {createdKey && (
        <div className="space-y-2 border border-line bg-surface-alt p-3">
          <p>Copy this key now. It will not be shown again.</p>
          <code className="block break-all">{createdKey}</code>
          <Button
            type="button"
            className="btn text-xs"
            onClick={() => setCreatedKey("")}
          >
            Dismiss
          </Button>
        </div>
      )}
      <ul className="divide-y">
        {keys.map((key) => (
          <li
            key={key.id}
            className="flex flex-wrap items-center justify-between gap-4 py-3"
          >
            <div>
              <p className="font-medium">{key.name}</p>
              <p className="text-xs text-muted">
                Created {formatDate(key.createdAt)} · Last used{" "}
                {key.lastRequest ? formatDate(key.lastRequest) : "Never"}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => void revoke(key.id)}
              className="btn btn-danger text-xs"
            >
              Revoke
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
