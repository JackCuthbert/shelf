"use client";

import { useState } from "react";
import { IconPicker } from "@/components/icon-picker";
import { trpc } from "@/components/trpc-provider";

type App = { id: string; name: string; url: string; iconSlug: string; createdAt: string; updatedAt: string };
type Draft = { name: string; url: string; iconSlug: string };
const emptyDraft: Draft = { name: "", url: "", iconSlug: "" };

export function SharedApps({ initialApps }: { initialApps: App[] }) {
  const utils = trpc.useUtils();
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, { initialData: initialApps });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [error, setError] = useState("");
  const create = trpc.apps.create.useMutation({ onSuccess: refresh, onError: (cause) => setError(cause.message) });
  const update = trpc.apps.update.useMutation({ onSuccess: refresh, onError: (cause) => setError(cause.message) });
  const remove = trpc.apps.delete.useMutation({ onSuccess: refresh, onError: (cause) => setError(cause.message) });
  const pending = create.isPending || update.isPending;

  function refresh() {
    setDraft(emptyDraft);
    setEditingId(null);
    setError("");
    void utils.apps.list.invalidate();
  }
  function beginCreate() { setEditingId(""); setDraft(emptyDraft); setError(""); }
  function beginEdit(app: App) { setEditingId(app.id); setDraft({ name: app.name, url: app.url, iconSlug: app.iconSlug }); setError(""); }
  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!draft.iconSlug) { setError("Choose an icon before saving."); return; }
    if (editingId) update.mutate({ id: editingId, ...draft });
    else create.mutate(draft);
  }

  return <section className="mt-10">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm font-semibold tracking-[0.18em] text-emerald-800">HOUSEHOLD LIBRARY</p><h2 className="mt-1 text-2xl font-semibold">Shared apps</h2><p className="mt-1 text-stone-600">Apps are available to everyone in your household.</p></div>
      {editingId === null && <button type="button" onClick={beginCreate} className="rounded-xl bg-emerald-800 px-4 py-3 font-medium text-white hover:bg-emerald-900">Add app</button>}
    </div>

    {editingId !== null && <form onSubmit={save} className="mt-5 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
      <h3 className="text-lg font-semibold">{editingId ? "Edit app" : "Add an app"}</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-base" /></label>
        <label className="text-sm font-medium">URL<input required type="url" placeholder="https://example.home" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2 text-base" /></label>
      </div>
      <IconPicker value={draft.iconSlug} onChange={(iconSlug) => setDraft({ ...draft, iconSlug })} />
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error} Your entries are still here; choose another icon or retry saving.</p>}
      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={pending} className="rounded-xl bg-emerald-800 px-4 py-2.5 font-medium text-white disabled:opacity-50">{pending ? "Saving…" : "Save app"}</button>
        <button type="button" onClick={() => { setEditingId(null); setError(""); }} className="rounded-xl border border-stone-300 px-4 py-2.5 font-medium">Cancel</button>
      </div>
    </form>}

    {error && editingId === null && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {apps.length === 0 && editingId === null ? <div className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white/70 px-6 py-12 text-center"><p className="font-medium">No shared apps yet</p><p className="mt-1 text-sm text-stone-600">Add the household’s first app to get started.</p></div> : <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {apps.map((app) => <li key={app.id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4">
        <img src={`/icons/${app.iconSlug}`} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-stone-50 object-contain p-1" />
        <div className="min-w-0 flex-1"><h3 className="truncate font-semibold">{app.name}</h3><a href={app.url} target="_blank" rel="noreferrer" className="block truncate text-sm text-emerald-800 underline decoration-emerald-800/30 underline-offset-2">{app.url}</a></div>
        <div className="flex shrink-0 gap-1"><button type="button" onClick={() => beginEdit(app)} aria-label={`Edit ${app.name}`} className="rounded-lg px-2.5 py-2 text-sm hover:bg-stone-100">Edit</button><button type="button" onClick={() => { if (window.confirm(`Delete ${app.name} from the shared app library?`)) { setError(""); remove.mutate({ id: app.id }); } }} aria-label={`Delete ${app.name}`} className="rounded-lg px-2.5 py-2 text-sm text-red-700 hover:bg-red-50">Delete</button></div>
      </li>)}
    </ul>}
  </section>;
}
