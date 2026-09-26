"use client"

import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuArrowLeft, LuCheck, LuImage, LuLoader } from "react-icons/lu"
import { ModalFooter } from "@/components/modal"
import {
  type Catalogue,
  IconCatalogueSearch,
  iconPreviewUrl,
} from "@/components/icon-catalogue"
import type { ImportRow } from "@/lib/homarr-import"
import { PLACEHOLDER_ICON_SLUG } from "@/lib/placeholder-icon"

export function HomarrImportReview({
  rows,
  filter,
  onFilterChange,
  onToggleRow,
  onToggleAll,
  catalogue,
  catalogueError,
  onRetryCatalogue,
  openIconKey,
  onOpenIcon,
  onSelectIcon,
  failures,
  pending,
  onBack,
  onImport,
}: {
  rows: ImportRow[]
  filter: string
  onFilterChange: (value: string) => void
  onToggleRow: (key: string, selected: boolean) => void
  onToggleAll: (selected: boolean) => void
  catalogue: Catalogue | null
  catalogueError: string
  onRetryCatalogue: () => void
  openIconKey: string | null
  onOpenIcon: (key: string | null) => void
  onSelectIcon: (key: string, slug: string) => void
  failures: { name: string; reason: string }[]
  pending: boolean
  onBack: () => void
  onImport: () => void
}) {
  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? rows.filter((row) =>
        `${row.name} ${row.description} ${row.url}`
          .toLowerCase()
          .includes(needle),
      )
    : rows
  const importable = rows.filter((row) => row.importable)
  const selected = rows.filter((row) => row.selected && row.importable)

  if (rows.length === 0)
    return (
      <div className="panel border-dashed px-6 py-12 text-center">
        <p className="font-medium">No apps found in Homarr</p>
        <p className="mt-1 text-sm text-muted">
          This instance has no apps to import.
        </p>
        <div className="mt-4 flex justify-center">
          <Button type="button" className="btn" onClick={onBack}>
            <LuArrowLeft aria-hidden className="size-4" />
            Back
          </Button>
        </div>
      </div>
    )

  return (
    <div>
      {rows.length > 0 && (
        <Input
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter apps…"
          className="field"
        />
      )}
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={
            importable.length > 0 && selected.length === importable.length
          }
          onChange={(event) => onToggleAll(event.target.checked)}
        />
        Select all importable apps
      </label>
      <p className="mt-1 text-sm text-muted">
        {selected.length} of {importable.length} selected
      </p>
      {failures.length > 0 && (
        <ul
          role="alert"
          className="mt-3 space-y-1 border border-danger p-3 text-sm text-danger"
        >
          {failures.map((failure) => (
            <li key={failure.name}>
              {failure.name}: {failure.reason}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {visible.map((row) => (
          <li key={row.key} className="panel p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={row.selected}
                disabled={!row.importable}
                onChange={(event) => onToggleRow(row.key, event.target.checked)}
                aria-label={`Import ${row.name}`}
              />
              <img
                src={
                  row.iconSlug && catalogue && catalogue[row.iconSlug]
                    ? iconPreviewUrl(catalogue[row.iconSlug], row.iconSlug)
                    : `/icons/${row.iconSlug || PLACEHOLDER_ICON_SLUG}`
                }
                alt=""
                className="h-10 w-10 shrink-0 border border-line bg-background object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.name}</p>
                {row.description && (
                  <p className="line-clamp-2 text-sm text-muted">
                    {row.description}
                  </p>
                )}
                <p className="truncate text-sm text-muted">{row.url}</p>
                {!row.importable && row.reason && (
                  <p className="mt-1 text-xs text-danger">{row.reason}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {row.iconSlug || PLACEHOLDER_ICON_SLUG}
                </p>
              </div>
              <Button
                type="button"
                className="btn text-xs"
                disabled={!row.importable}
                onClick={() =>
                  onOpenIcon(openIconKey === row.key ? null : row.key)
                }
              >
                <LuImage aria-hidden className="size-4" />
                Icon
              </Button>
            </div>
            {openIconKey === row.key && (
              <IconCatalogueSearch
                catalogue={catalogue}
                error={catalogueError}
                onRetry={onRetryCatalogue}
                value={row.iconSlug}
                onSelect={(slug) => onSelectIcon(row.key, slug)}
              />
            )}
          </li>
        ))}
      </ul>
      <ModalFooter>
        <Button type="button" className="btn" onClick={onBack}>
          <LuArrowLeft aria-hidden className="size-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={pending || selected.length === 0}
          className="btn btn-primary"
          onClick={onImport}
        >
          {pending ? (
            <LuLoader aria-hidden className="size-4 animate-spin" />
          ) : (
            <LuCheck aria-hidden className="size-4" />
          )}
          <span>
            {pending
              ? "Importing…"
              : `Import ${selected.length} app${selected.length === 1 ? "" : "s"}`}
          </span>
        </Button>
      </ModalFooter>
    </div>
  )
}
