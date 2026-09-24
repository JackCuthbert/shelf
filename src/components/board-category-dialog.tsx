"use client"

import { useEffect, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Dialog } from "@base-ui/react/dialog"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { LuCheck, LuLoader, LuX } from "react-icons/lu"
import { ModalContent } from "@/components/modal"

export type CategoryRecord = {
  id: string
  title: string
  description: string
}
type Draft = { title: string; description: string }
const emptyDraft: Draft = { title: "", description: "" }

export function BoardCategoryDialog({
  open,
  onOpenChange,
  category,
  pending,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  category?: CategoryRecord | null
  pending: boolean
  onSave: (values: Draft) => void
}) {
  const [draft, setDraft] = useState<Draft>(emptyDraft)

  useEffect(() => {
    if (!open) return
    setDraft(
      category
        ? { title: category.title, description: category.description ?? "" }
        : emptyDraft,
    )
  }, [open, category])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <ModalContent title={category ? "Edit category" : "Add category"}>
        <Form
          onFormSubmit={() =>
            onSave({
              title: draft.title.trim(),
              description: draft.description.trim(),
            })
          }
        >
          <Field.Root name="title" className="space-y-2">
            <Field.Label className="text-xs text-muted">Title</Field.Label>
            <Input
              className="field"
              required
              maxLength={80}
              value={draft.title}
              onChange={(event) =>
                setDraft({ ...draft, title: event.target.value })
              }
            />
            <Field.Error className="text-xs text-danger" />
          </Field.Root>
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
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="btn">
              <LuX aria-hidden className="size-4" />
              Cancel
            </Dialog.Close>
            <Button
              type="submit"
              disabled={pending || !draft.title.trim()}
              className="btn btn-primary"
            >
              {pending ? (
                <LuLoader aria-hidden className="size-4 animate-spin" />
              ) : (
                <LuCheck aria-hidden className="size-4" />
              )}
              <span>{pending ? "Saving…" : "Save category"}</span>
            </Button>
          </div>
        </Form>
      </ModalContent>
    </Dialog.Root>
  )
}
