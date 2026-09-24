"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { rankApps } from "@/lib/board-search";

type BoardApp = { id: string; name: string; url: string; iconSlug: string };

export function BoardSearch({ apps }: { apps: BoardApp[] }) {
  const [query, setQuery] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => rankApps(apps, query), [apps, query]);

  const clear = useCallback(() => {
    setQuery("");
    setHighlighted(0);
  }, []);

  useEffect(() => {
    setHighlighted(0);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      const typing = target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((event.key === "/" || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")) && !typing) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setHighlighted((current) => (current - 1 + results.length) % results.length);
    } else if (event.key === "Enter" && results.length) {
      event.preventDefault();
      window.open(results[highlighted]?.url, "_blank", "noopener,noreferrer");
    } else if (event.key === "Escape") {
      event.preventDefault();
      clear();
    }
  };

  return <section aria-label="Board apps">
    <label htmlFor="board-search" className="sr-only">Search apps</label>
    <input
      ref={inputRef}
      id="board-search"
      type="search"
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={onSearchKeyDown}
      placeholder="Search apps…"
      aria-controls="board-app-results"
      aria-describedby="board-search-hint"
      className="mt-7 w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none placeholder:text-stone-400 focus-visible:border-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-700/30"
    />
    <p id="board-search-hint" className="sr-only">Use up and down arrows to select an app, Enter to open it in a new tab, and Escape to clear.</p>
    {results.length === 0 ? <p className="mt-4 rounded-xl border border-stone-200 bg-white px-5 py-8 text-center text-stone-600" role="status">No apps match “{query}”.</p> :
      <ul id="board-app-results" className="mt-4 divide-y divide-stone-200 overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {results.map((app, index) => <li key={app.id}>
          <a href={app.url} target="_blank" rel="noreferrer" aria-current={index === highlighted ? "true" : undefined} onFocus={() => setHighlighted(index)} className={`flex min-w-0 items-center gap-4 p-4 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-emerald-700 sm:p-5 ${index === highlighted ? "bg-emerald-50" : "hover:bg-stone-50"}`}>
            <img src={`/icons/${app.iconSlug}`} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-stone-50 object-contain p-1" />
            <span className="min-w-0 flex-1 truncate font-medium">{app.name}</span>
            <span aria-hidden="true" className="text-stone-400">↗</span>
          </a>
        </li>)}
      </ul>}
  </section>;
}
