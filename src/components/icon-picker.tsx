"use client";

import { useEffect, useMemo, useState } from "react";

type CatalogueEntry = { base: string; aliases?: string[] };
type Catalogue = Record<string, CatalogueEntry>;
const METADATA_URL = "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json";
const CDN = "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons";

export function IconPicker({ value, onChange, cachedValue }: { value: string; onChange: (slug: string) => void; cachedValue?: string }) {
  const [open, setOpen] = useState(false);
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || catalogue) return;
    const controller = new AbortController();
    fetch(METADATA_URL, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error("Could not load the icon catalogue."); return response.json() as Promise<Catalogue>; })
      .then(setCatalogue)
      .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load the icon catalogue."); });
    return () => controller.abort();
  }, [open, catalogue]);

  const results = useMemo(() => {
    if (!catalogue) return [];
    const needle = query.trim().toLowerCase();
    return Object.entries(catalogue).filter(([slug, entry]) => !needle || `${slug} ${(entry.aliases ?? []).join(" ")}`.toLowerCase().includes(needle)).slice(0, 60);
  }, [catalogue, query]);
  const selectedEntry = value && value !== cachedValue ? catalogue?.[value] : undefined;
  const selectedPreview = selectedEntry
    ? `${CDN}/${selectedEntry.base}/${value}.${selectedEntry.base}`
    : value ? `/icons/${value}` : null;

  return <div className="mt-3">
    <div className="flex items-center gap-3 rounded-xl border border-stone-300 bg-stone-50 p-3">
      {selectedPreview ? <img className="h-10 w-10 rounded-md object-contain" src={selectedPreview} alt="" /> : <span className="grid h-10 w-10 place-items-center rounded-md bg-stone-200 text-xs">No icon</span>}
      <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-wide text-stone-500">Selected icon</p><p className="truncate">{value || "Choose an icon"}</p></div>
      <button type="button" onClick={() => { setOpen(!open); setError(""); }} className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium hover:bg-white">{open ? "Close" : "Choose icon"}</button>
    </div>
    {open && <div className="mt-3 rounded-xl border border-stone-200 p-3">
      <label className="block text-sm font-medium" htmlFor="icon-search">Search Dashboard Icons</label>
      <input id="icon-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or alias" className="mt-2 w-full rounded-lg border border-stone-300 px-3 py-2" />
      {error && <p role="alert" className="mt-2 text-sm text-red-700">{error} <button type="button" className="underline" onClick={() => { setCatalogue(null); setError(""); }}>Retry</button></p>}
      {!catalogue && !error && <p className="mt-3 text-sm text-stone-600">Loading icon catalogue…</p>}
      {catalogue && <div className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4" aria-label="Icon results">
        {results.map(([slug, entry]) => <button type="button" key={slug} onClick={() => { onChange(slug); setOpen(false); }} aria-pressed={slug === value} className={`flex min-w-0 items-center gap-2 rounded-lg border p-2 text-left hover:bg-emerald-50 ${slug === value ? "border-emerald-700 bg-emerald-50" : "border-stone-200"}`}>
          <img className="h-8 w-8 shrink-0 object-contain" src={`${CDN}/${entry.base}/${slug}.${entry.base}`} alt="" loading="lazy" />
          <span className="truncate text-sm">{slug}</span>
        </button>)}
        {results.length === 0 && <p className="col-span-full py-4 text-center text-sm text-stone-600">No matching icons.</p>}
      </div>}
      <p className="mt-2 text-xs text-stone-500">Previews load from Dashboard Icons. Only the selected icon is saved locally when you save this app.</p>
    </div>}
  </div>;
}
