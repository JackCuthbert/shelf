"use client"

import { Button } from "@base-ui/react/button"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { LuLoader, LuPlug } from "react-icons/lu"

export function HomarrImportConnect({
  baseUrl,
  apiKey,
  onBaseUrlChange,
  onApiKeyChange,
  error,
  pending,
  onSubmit,
}: {
  baseUrl: string
  apiKey: string
  onBaseUrlChange: (value: string) => void
  onApiKeyChange: (value: string) => void
  error: string
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Form onFormSubmit={onSubmit}>
      <Field.Root name="baseUrl" className="space-y-2">
        <Field.Label className="text-xs text-muted">Homarr address</Field.Label>
        <Input
          className="field"
          required
          type="url"
          placeholder="https://homarr.example"
          value={baseUrl}
          onChange={(event) => onBaseUrlChange(event.target.value)}
        />
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      <Field.Root name="apiKey" className="mt-4 space-y-2">
        <Field.Label className="text-xs text-muted">API key</Field.Label>
        <Input
          className="field"
          required
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
        />
        <p className="text-xs text-muted">
          Create an API key under Authentication in Homarr. It is used once and
          never stored.
        </p>
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      {error && (
        <p
          role="alert"
          className="mt-3 border border-danger p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? (
            <LuLoader aria-hidden className="size-4 animate-spin" />
          ) : (
            <LuPlug aria-hidden className="size-4" />
          )}
          <span>{pending ? "Connecting…" : "Connect"}</span>
        </Button>
      </div>
    </Form>
  )
}
