"use client";

import { useId, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Input } from "@base-ui/react/input";
import { LuPlus } from "react-icons/lu";
import { ModalContent } from "@/components/modal";

type App = { id: string; name: string; url: string; iconSlug: string };

function hostname(url: string) {
  try { return new URL(url).hostname; } catch { return url; }
}

export function BoardAppDialog({ boardName, apps, onAssign }: { boardName: string; apps: App[]; onAssign: (appId: string) => void }) {
  const [filter, setFilter] = useState("");
  const filterId = useId();
  const needle = filter.trim().toLowerCase();
  const visible = needle ? apps.filter((app) => `${app.name} ${app.url}`.toLowerCase().includes(needle)) : apps;

  return <Dialog.Root onOpenChange={(open) => { if (!open) setFilter(""); }}>
    <Dialog.Trigger className="btn text-xs"><LuPlus aria-hidden className="size-4" />Add app</Dialog.Trigger>
    <ModalContent title="Add app" description={`Choose an app to add to “${boardName}”.`}>
      {apps.length === 0 ? <p className="text-sm text-muted">Every app in the library is already on this board.</p> : <>
        <label htmlFor={filterId} className="sr-only">Filter apps</label>
        <Input id={filterId} type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Filter apps…" className="field" />
        {visible.length === 0 ? <p role="status" className="mt-3 text-sm text-muted">No apps match “{filter}”.</p> : <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
          {visible.map((app) => <li key={app.id}><Dialog.Close onClick={() => onAssign(app.id)} className="flex w-full items-center gap-3 border border-line bg-background p-2 text-left hover:border-accent hover:bg-surface-alt"><img src={`/icons/${app.iconSlug}`} alt="" className="h-9 w-9 shrink-0 border border-line bg-surface object-contain p-1" /><span className="min-w-0 flex-1"><span className="block truncate font-medium">{app.name}</span><span className="block truncate text-xs text-muted">{hostname(app.url)}</span></span><LuPlus aria-hidden className="size-4 shrink-0 text-muted" /></Dialog.Close></li>)}
        </ul>}
      </>}
    </ModalContent>
  </Dialog.Root>;
}
