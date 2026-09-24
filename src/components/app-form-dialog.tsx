"use client";

import { useEffect, useState } from "react";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { LuCheck, LuLoader, LuX } from "react-icons/lu";
import { IconPicker } from "@/components/icon-picker";
import { ModalContent } from "@/components/modal";
import { trpc } from "@/components/trpc-provider";

export type AppRecord = { id: string; name: string; url: string; iconSlug: string };
type Draft = { name: string; url: string; iconSlug: string };
const emptyDraft: Draft = { name: "", url: "", iconSlug: "" };

export function AppFormDialog({ open, onOpenChange, app, trigger, onSaved }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  app?: AppRecord | null;
  trigger?: React.ReactNode;
  onSaved?: () => void;
}) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const create = trpc.apps.create.useMutation({ onSuccess: done, onError: (cause) => setError(cause.message) });
  const update = trpc.apps.update.useMutation({ onSuccess: done, onError: (cause) => setError(cause.message) });
  const pending = create.isPending || update.isPending;

  useEffect(() => {
    if (!open) return;
    setDraft(app ? { name: app.name, url: app.url, iconSlug: app.iconSlug } : emptyDraft);
    setError("");
  }, [open, app]);

  function done() { void utils.apps.list.invalidate(); onSaved?.(); onOpenChange(false); }
  function save() {
    setError("");
    if (!draft.iconSlug) { setError("Choose an icon before saving."); return; }
    if (app) update.mutate({ id: app.id, ...draft });
    else create.mutate(draft);
  }

  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    {trigger}
    <ModalContent title={app ? "Edit app" : "Add an app"} description={app ? undefined : "Apps are shared across every board in the household."}>
      <Form onFormSubmit={save}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field.Root name="name" className="space-y-2">
            <Field.Label className="text-xs text-muted">Name</Field.Label>
            <Input className="field" required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <Field.Error className="text-xs text-danger" />
          </Field.Root>
          <Field.Root name="url" className="space-y-2">
            <Field.Label className="text-xs text-muted">URL</Field.Label>
            <Input className="field" required type="url" placeholder="https://example.home" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} />
            <Field.Error className="text-xs text-danger" />
          </Field.Root>
        </div>
        <IconPicker value={draft.iconSlug} cachedValue={app?.iconSlug} onChange={(iconSlug) => setDraft({ ...draft, iconSlug })} />
        {error && <p role="alert" className="mt-3 border border-danger p-3 text-sm text-danger">{error} Your entries are still here; choose another icon or retry saving.</p>}
        <div className="mt-5 flex justify-end gap-2">
          <Dialog.Close className="btn"><LuX aria-hidden className="size-4" />Cancel</Dialog.Close>
          <Button type="submit" disabled={pending} className="btn btn-primary">{pending ? <LuLoader aria-hidden className="size-4 animate-spin" /> : <LuCheck aria-hidden className="size-4" />}<span>{pending ? "Saving…" : "Save app"}</span></Button>
        </div>
      </Form>
    </ModalContent>
  </Dialog.Root>;
}
