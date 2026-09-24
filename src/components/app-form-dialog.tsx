"use client"

import { useEffect, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { LuCheck, LuLoader, LuX } from "react-icons/lu"
import { IconPicker } from "@/components/icon-picker"
import { ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"

export type AppRecord = {
  id: string
  name: string
  description: string
  url: string
  iconSource: string
  iconSlug: string | null
  customIconUrl: string | null
}
type Draft = {
  name: string
  description: string
  url: string
  iconSource: "dashboard" | "url"
  iconSlug: string
  iconUrl: string
}
const emptyDraft: Draft = {
  name: "",
  description: "",
  url: "",
  iconSource: "dashboard",
  iconSlug: "",
  iconUrl: "",
}

export function AppFormDialog({
  open,
  onOpenChange,
  app,
  trigger,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  app?: AppRecord | null
  trigger?: React.ReactNode
  onSaved?: () => void
}) {
  const utils = trpc.useUtils()
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [error, setError] = useState("")
  const create = trpc.apps.create.useMutation({
    onSuccess: done,
    onError: (cause) => setError(cause.message),
  })
  const update = trpc.apps.update.useMutation({
    onSuccess: done,
    onError: (cause) => setError(cause.message),
  })
  const pending = create.isPending || update.isPending

  useEffect(() => {
    if (!open) return
    setDraft(
      app
        ? {
            name: app.name,
            description: app.description ?? "",
            url: app.url,
            iconSource: app.iconSource === "url" ? "url" : "dashboard",
            iconSlug: app.iconSlug ?? "",
            iconUrl: app.customIconUrl ?? "",
          }
        : emptyDraft,
    )
    setError("")
  }, [open, app])

  function done() {
    void utils.apps.list.invalidate()
    onSaved?.()
    onOpenChange(false)
  }
  function payload() {
    const base = {
      name: draft.name,
      description: draft.description,
      url: draft.url,
    }
    return draft.iconSource === "url"
      ? { ...base, iconSource: "url" as const, iconUrl: draft.iconUrl }
      : { ...base, iconSource: "dashboard" as const, iconSlug: draft.iconSlug }
  }
  function save() {
    setError("")
    if (draft.iconSource === "dashboard" && !draft.iconSlug) {
      setError("Choose an icon before saving.")
      return
    }
    if (draft.iconSource === "url" && !draft.iconUrl.trim()) {
      setError("Enter an image URL before saving.")
      return
    }
    if (app) update.mutate({ id: app.id, ...payload() })
    else create.mutate(payload())
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <ModalContent
        title={app ? "Edit app" : "Add an app"}
        description={
          app
            ? undefined
            : "Apps are shared across every board in the household."
        }
      >
        <Form onFormSubmit={save}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field.Root name="name" className="space-y-2">
              <Field.Label className="text-xs text-muted">Name</Field.Label>
              <Input
                className="field"
                required
                maxLength={120}
                value={draft.name}
                onChange={(event) =>
                  setDraft({ ...draft, name: event.target.value })
                }
              />
              <Field.Error className="text-xs text-danger" />
            </Field.Root>
            <Field.Root name="url" className="space-y-2">
              <Field.Label className="text-xs text-muted">URL</Field.Label>
              <Input
                className="field"
                required
                type="url"
                placeholder="https://example.home"
                value={draft.url}
                onChange={(event) =>
                  setDraft({ ...draft, url: event.target.value })
                }
              />
              <Field.Error className="text-xs text-danger" />
            </Field.Root>
          </div>
          <Field.Root name="description" className="mt-4 space-y-2">
            <Field.Label className="text-xs text-muted">
              Description (optional)
            </Field.Label>
            <textarea
              className="field min-h-20 resize-y"
              maxLength={280}
              value={draft.description}
              onChange={(event) =>
                setDraft({ ...draft, description: event.target.value })
              }
            />
            <p className="text-xs text-muted">{draft.description.length}/280</p>
          </Field.Root>
          <IconPicker
            value={{
              source: draft.iconSource,
              slug: draft.iconSlug,
              url: draft.iconUrl,
            }}
            cachedSlug={
              app?.iconSource === "dashboard" ? app.iconSlug : undefined
            }
            onChange={(icon) =>
              setDraft({
                ...draft,
                iconSource: icon.source,
                iconSlug: icon.slug,
                iconUrl: icon.url,
              })
            }
          />
          {error && (
            <p
              role="alert"
              className="mt-3 border border-danger p-3 text-sm text-danger"
            >
              {error} Your entries are still here; choose another icon or retry
              saving.
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="btn">
              <LuX aria-hidden className="size-4" />
              Cancel
            </Dialog.Close>
            <Button
              type="submit"
              disabled={pending}
              className="btn btn-primary"
            >
              {pending ? (
                <LuLoader aria-hidden className="size-4 animate-spin" />
              ) : (
                <LuCheck aria-hidden className="size-4" />
              )}
              <span>{pending ? "Saving…" : "Save app"}</span>
            </Button>
          </div>
        </Form>
      </ModalContent>
    </Dialog.Root>
  )
}
