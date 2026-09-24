"use client";

import { useState } from "react";
import { trpc } from "@/components/trpc-provider";

type Board = { id: string; name: string; nanoid: string; ownerId: string; createdAt: string; updatedAt: string; apps: Array<{ boardId: string; appId: string; position: number; app: App }> };
type App = { id: string; name: string; url: string; iconSlug: string; createdAt: string; updatedAt: string };

export function BoardsAdmin({ initialBoards, initialApps }: { initialBoards: Board[]; initialApps: App[] }) {
  const utils = trpc.useUtils();
  const { data: boards = initialBoards } = trpc.boards.list.useQuery(undefined, { initialData: initialBoards });
  const { data: apps = initialApps } = trpc.apps.list.useQuery(undefined, { initialData: initialApps });
  const [name, setName] = useState("");
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

  return <section className="mt-10">
    <p className="text-sm font-semibold tracking-[0.18em] text-emerald-800">MY BOARDS</p>
    <h2 className="mt-1 text-2xl font-semibold">Boards</h2>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}. Your changes were not saved; please retry.</p>}
    <form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); create.mutate({ name }, { onSuccess: () => setName("") }); }}>
      <label className="sr-only" htmlFor="new-board">New board name</label><input id="new-board" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="New board name" className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2" />
      <button className="rounded-xl bg-emerald-800 px-4 py-2 font-medium text-white">Create board</button>
    </form>
    {boards.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center text-stone-600">Create your first board to start sharing apps.</p> : <ul className="mt-5 space-y-4">
      {boards.map((board) => <li key={board.id} className="rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="text-lg font-semibold">{board.name}</h3><a className="break-all text-sm text-emerald-800 underline" href={`/board/${board.nanoid}`}>{`${typeof window === "undefined" ? "" : window.location.origin}/board/${board.nanoid}`}</a></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { const next = window.prompt("Rename board", board.name); if (next?.trim()) rename.mutate({ id: board.id, name: next }); }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Rename</button>
            <button type="button" onClick={() => setDefault.mutate({ id: board.id })} className="rounded-lg border border-stone-300 px-3 py-2 text-sm">Set as default</button>
            <button type="button" onClick={() => { if (window.confirm(`Delete ${board.name}?`)) remove.mutate({ id: board.id }); }} className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-700">Delete</button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><label htmlFor={`assign-${board.id}`} className="text-sm font-medium">Add app</label><select id={`assign-${board.id}`} defaultValue="" onChange={(event) => { if (event.target.value) assign.mutate({ boardId: board.id, appId: event.target.value }, { onSuccess: () => { event.target.value = ""; } }); }} className="rounded-lg border border-stone-300 bg-white px-3 py-2"><option value="">Choose an app</option>{apps.filter((app) => !board.apps.some((entry) => entry.appId === app.id)).map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}</select></div>
        {board.apps.length === 0 ? <p className="mt-4 text-sm text-stone-600">No apps assigned yet.</p> : <ol className="mt-4 space-y-2">{board.apps.map((entry, index) => <li key={entry.appId} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3"><img src={`/icons/${entry.app.iconSlug}`} alt="" className="h-9 w-9 rounded-lg bg-white object-contain p-1"/><span className="min-w-0 flex-1 truncate font-medium">{entry.app.name}</span><button type="button" disabled={index === 0} onClick={() => move.mutate({ boardId: board.id, appId: entry.appId, direction: "up" })} aria-label={`Move ${entry.app.name} up`} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">Move up</button><button type="button" disabled={index === board.apps.length - 1} onClick={() => move.mutate({ boardId: board.id, appId: entry.appId, direction: "down" })} aria-label={`Move ${entry.app.name} down`} className="rounded-lg border border-stone-300 px-3 py-2 text-sm disabled:opacity-40">Move down</button><button type="button" onClick={() => unassign.mutate({ boardId: board.id, appId: entry.appId })} className="rounded-lg px-2 py-2 text-sm text-red-700">Remove</button></li>)}</ol>}
      </li>)}
    </ul>}
  </section>;
}
