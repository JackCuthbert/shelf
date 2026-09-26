"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuRotateCw } from "react-icons/lu"

export type CatalogueEntry = { base: string; aliases?: string[] }
export type Catalogue = Record<string, CatalogueEntry>

export const ICON_METADATA_URL =
  "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json"
export const ICON_CDN =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"

export function iconCatalogueRequestKey(
  active: boolean,
  catalogue: Catalogue | null,
  attempt: number,
): number | null {
  if (!active || catalogue) return null
  return attempt
}

export function useIconCatalogue(active: boolean) {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  const requestKey = iconCatalogueRequestKey(active, catalogue, attempt)

  useEffect(() => {
    if (requestKey === null) return
    const controller = new AbortController()
    fetch(ICON_METADATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the icon catalogue.")
        return response.json() as Promise<Catalogue>
      })
      .then(setCatalogue)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the icon catalogue.",
          )
      })
    return () => controller.abort()
  }, [requestKey])

  return {
    catalogue,
    error,
    retry: () => {
      setCatalogue(null)
      setError("")
      setAttempt((value) => value + 1)
    },
  }
}

export function filterIcons(catalogue: Catalogue, query: string) {
  const needle = query.trim().toLowerCase()
  return Object.entries(catalogue)
    .filter(
      ([slug, entry]) =>
        !needle ||
        `${slug} ${(entry.aliases ?? []).join(" ")}`
          .toLowerCase()
          .includes(needle),
    )
    .slice(0, 60)
}

export function iconPreviewUrl(entry: CatalogueEntry, slug: string) {
  return `${ICON_CDN}/${entry.base}/${slug}.${entry.base}`
}

export function IconCatalogueSearch({
  catalogue,
  error,
  onRetry,
  value,
  onSelect,
  embedded = false,
}: {
  catalogue: Catalogue | null
  error: string
  onRetry: () => void
  value: string
  onSelect: (slug: string) => void
  embedded?: boolean
}) {
  const [query, setQuery] = useState("")
  const results = useMemo(
    () => (catalogue ? filterIcons(catalogue, query) : []),
    [catalogue, query],
  )

  return (
    <div className={embedded ? "bg-background px-3 pb-3" : "panel mt-3 p-3"}>
      <label className="text-xs text-muted" htmlFor="icon-search">
        Search Dashboard Icons
      </label>
      <Input
        id="icon-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or alias"
        className="field mt-2"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}{" "}
          <Button type="button" className="underline" onClick={onRetry}>
            <LuRotateCw
              aria-hidden
              className="mr-1 inline size-3.5 align-[-2px]"
            />
            Retry
          </Button>
        </p>
      )}
      {!catalogue && !error && (
        <p className="mt-3 text-sm text-muted">Loading icon catalogue…</p>
      )}
      {catalogue && (
        <>
          <div
            className="mt-3 grid max-h-[11.5rem] grid-cols-2 gap-2 overflow-y-auto border border-line p-2 sm:grid-cols-3 md:grid-cols-4"
            aria-label="Icon results"
          >
            {results.map(([slug, entry]) => (
              <Button
                type="button"
                key={slug}
                onClick={() => onSelect(slug)}
                aria-pressed={slug === value}
                className={`flex min-w-0 items-center gap-2 border p-2 text-left hover:border-foreground ${slug === value ? "border-accent bg-surface-alt" : "border-line"}`}
              >
                <img
                  className="h-8 w-8 shrink-0 object-contain"
                  src={iconPreviewUrl(entry, slug)}
                  alt=""
                  loading="lazy"
                />
                <span className="truncate text-sm">{slug}</span>
              </Button>
            ))}
            {results.length === 0 && (
              <p className="col-span-full py-4 text-center text-sm text-muted">
                No matching icons.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
