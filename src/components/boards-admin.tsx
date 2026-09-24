"use client";

import { useState } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Button } from "@base-ui/react/button";
import { Dialog } from "@base-ui/react/dialog";
import { Field } from "@base-ui/react/field";
import { Form } from "@base-ui/react/form";
import { Input } from "@base-ui/react/input";
import { Tooltip } from "@base-ui/react/tooltip";
import { LuArrowDown, LuArrowUp, LuExternalLink, LuPencil, LuPlus, LuStar, LuTrash2, LuX } from "react-icons/lu";
import { AppFormDialog } from "@/components/app-form-dialog";
import { BoardAppDialog } from "@/components/board-app-dialog";
import { ConfirmContent, ModalContent } from "@/components/modal";
import { trpc } from "@/components/trpc-provider";

type Board = { id: string; name: string; nanoid: string; ownerId: string; createdAt: string; updatedAt: string; apps: Array<{ boardId: string; appId: string; position: number; app: App }> };
type App = { id: string; name: string; url: string; iconSlug: string; createdAt: string; updatedAt: string };

function hostname(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

export function BoardsAdmin({ initialBoards, initialApps, initialDefaultBoardId = null }: { initialBoards: Board[]; initialApps: App[]; initialDefaultBoardId?: string | null }) {
  const utils = trpc.useUtils();
  const { data: boards = initialBoards } = trpc.boards.list.useQuery(undefined, { initialData: initialBoards });
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, { initialData: initialApps });
  const [name, setName] = useState("");
  const [defaultId, setDefaultId] = useState<string | null>(initialDefaultBoardId);
  const [addOpen, setAddOpen] = useState(false);
  const [addAppOpen, setAddAppOpen] = useState(false);
  const [renaming, setRenaming] = useState<{ id: string; name: string } | null>(null);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [error, setError] = useState("");
  const refresh = () => { setError(""); void utils.boards.list.invalidate(); };
  const fail = (cause: { message: string }) => setError(cause.message);
  const create = trpc.boards.create.useMutation({ onSuccess: refresh, onError: fail });
  const rename = trpc.boards.rename.useMutation({ onSuccess: refresh, onError: fail });
  const remove = trpc.boards.delete.useMutation({ onSuccess: refresh, onError: fail });
  const setDefault = trpc.boards.setDefault.useMutation({ onSuccess: refresh, onError: fail });
  const assign = trpc.boards.assign.useMutation({ onSuccess: refresh, onError: fail });
  const unassign = trpc.boards.unassign.useMutation({ onSuccess: refresh, onError: fail });
  const move = trpc.boards.move.useMutation({ onSuccess: refresh, onError: fail });

  return <section>
    {error && <p role="alert" className="mb-4 border border-danger bg-surface p-3 text-sm text-danger">{error}. Your changes were not saved; please retry.</p>}
    <div className="flex flex-wrap items-center justify-between gap-4">
      <p className="text-muted">Boards belong to you and are reachable by anyone with the link.</p>
      <div className="flex flex-wrap gap-2">
        <Dialog.Root open={addOpen} onOpenChange={setAddOpen}>
          <Dialog.Trigger className="btn btn-primary"><LuPlus aria-hidden className="size-4" />Add board</Dialog.Trigger>
          <ModalContent title="Add board" description="Boards are reachable by anyone with the public link.">
            <Form onFormSubmit={(values) => create.mutate({ name: String(values.name ?? "") }, { onSuccess: (created) => { setName(""); setAddOpen(false); if (!defaultId) setDefaultId(created.id); } })}>
              <Field.Root name="name" className="space-y-2">
                <Field.Label className="text-xs text-muted">Board name</Field.Label>
                <Input className="field" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="New board name" />
                <Field.Error className="text-xs text-danger" />
              </Field.Root>
              <div className="mt-4 flex justify-end gap-2">
                <Dialog.Close className="btn">Cancel</Dialog.Close>
                <Button type="submit" className="btn btn-primary"><LuPlus aria-hidden className="size-4" />Create board</Button>
              </div>
            </Form>
          </ModalContent>
        </Dialog.Root>
        <AppFormDialog open={addAppOpen} onOpenChange={setAddAppOpen} app={null} trigger={<Dialog.Trigger className="btn"><LuPlus aria-hidden className="size-4" />Add app</Dialog.Trigger>} />
      </div>
    </div>
    <Dialog.Root open={renaming !== null} onOpenChange={(open) => { if (!open) setRenaming(null); }}>
      <ModalContent title="Rename board">
        <Form onFormSubmit={(values) => { if (renaming) rename.mutate({ id: renaming.id, name: String(values.name ?? "") }, { onSuccess: () => setRenaming(null) }); }}>
          <Field.Root name="name" className="space-y-2">
            <Field.Label className="text-xs text-muted">Board name</Field.Label>
            <Input key={renaming?.id} className="field" required maxLength={80} defaultValue={renaming?.name ?? ""} />
            <Field.Error className="text-xs text-danger" />
          </Field.Root>
          <div className="mt-4 flex justify-end gap-2">
            <Dialog.Close className="btn">Cancel</Dialog.Close>
            <Button type="submit" className="btn btn-primary"><LuPencil aria-hidden className="size-4" />Save</Button>
          </div>
        </Form>
      </ModalContent>
    </Dialog.Root>
    <AppFormDialog open={editingApp !== null} app={editingApp} onOpenChange={(open) => { if (!open) setEditingApp(null); }} onSaved={() => void utils.boards.list.invalidate()} />
    {boards.length === 0 ? <p className="panel mt-4 border-dashed p-8 text-center text-muted">Create your first board to start sharing apps.</p> : <ul className="mt-4 space-y-3">
      {boards.map((board) => {
        const available = apps.filter((app) => !board.apps.some((entry) => entry.appId === app.id));
        return <li key={board.id} className="panel p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><h3 className="text-lg font-semibold">{board.name}</h3><a className="inline-flex items-center gap-1 text-sm text-accent underline underline-offset-2" href={`/board/${board.nanoid}`} target="_blank" rel="noreferrer"><LuExternalLink aria-hidden className="size-3.5" />{`/board/${board.nanoid}`}</a></div>
            <div className="flex flex-wrap gap-2">
              <BoardAppDialog boardName={board.name} apps={available} onAssign={(appId) => assign.mutate({ boardId: board.id, appId })} />
              <Button className="btn text-xs" onClick={() => setRenaming({ id: board.id, name: board.name })}><LuPencil aria-hidden className="size-4" />Rename</Button>
              <Button className={`btn text-xs ${board.id === defaultId ? "text-accent disabled:opacity-100" : ""}`} disabled={board.id === defaultId} onClick={() => setDefault.mutate({ id: board.id }, { onSuccess: () => setDefaultId(board.id) })}><LuStar aria-hidden className={`size-4 ${board.id === defaultId ? "fill-current" : ""}`} />{board.id === defaultId ? "Default" : "Set as default"}</Button>
              <AlertDialog.Root>
                <AlertDialog.Trigger className="btn btn-danger text-xs"><LuTrash2 aria-hidden className="size-4" />Delete</AlertDialog.Trigger>
                <ConfirmContent title="Delete board" description={`Delete “${board.name}”? This removes the board and its assignments.`}>
                  <AlertDialog.Close className="btn">Cancel</AlertDialog.Close>
                  <AlertDialog.Close className="btn btn-danger" onClick={() => remove.mutate({ id: board.id }, { onSuccess: () => { if (defaultId === board.id) { const next = boards.find((item) => item.id !== board.id); setDefaultId(next?.id ?? null); } } })}><LuTrash2 aria-hidden className="size-4" />Delete</AlertDialog.Close>
                </ConfirmContent>
              </AlertDialog.Root>
            </div>
          </div>
          {board.apps.length === 0 ? <p className="mt-4 text-sm text-muted">No apps assigned yet.</p> : <ol className="mt-4 space-y-2">{board.apps.map((entry, index) => <li key={entry.appId} className="flex items-center gap-3 border border-line bg-background p-2"><img src={`/icons/${entry.app.iconSlug}`} alt="" className="h-9 w-9 shrink-0 border border-line bg-surface object-contain p-1" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{entry.app.name}</span><span className="block truncate text-xs text-muted">{hostname(entry.app.url)}</span></span><Tooltip.Root><Tooltip.Trigger render={<button type="button" className="btn text-xs" onClick={() => setEditingApp(entry.app)} aria-label={`Edit ${entry.app.name}`} />}><LuPencil aria-hidden className="size-4" /></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner sideOffset={6}><Tooltip.Popup className="panel px-2 py-1 text-xs">Edit</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root><Tooltip.Root><Tooltip.Trigger render={<button type="button" className="btn text-xs" disabled={index === 0} onClick={() => move.mutate({ boardId: board.id, appId: entry.appId, direction: "up" })} aria-label={`Move ${entry.app.name} up`} />}><LuArrowUp aria-hidden className="size-4" /></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner sideOffset={6}><Tooltip.Popup className="panel px-2 py-1 text-xs">Move up</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root><Tooltip.Root><Tooltip.Trigger render={<button type="button" className="btn text-xs" disabled={index === board.apps.length - 1} onClick={() => move.mutate({ boardId: board.id, appId: entry.appId, direction: "down" })} aria-label={`Move ${entry.app.name} down`} />}><LuArrowDown aria-hidden className="size-4" /></Tooltip.Trigger><Tooltip.Portal><Tooltip.Positioner sideOffset={6}><Tooltip.Popup className="panel px-2 py-1 text-xs">Move down</Tooltip.Popup></Tooltip.Positioner></Tooltip.Portal></Tooltip.Root><Button className="btn btn-danger text-xs" onClick={() => unassign.mutate({ boardId: board.id, appId: entry.appId })}><LuX aria-hidden className="size-4" />Remove</Button></li>)}</ol>}
        </li>;
      })}
    </ul>}
  </section>;
}
