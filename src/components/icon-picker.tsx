"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { LuImage, LuImageOff, LuX } from "react-icons/lu"
import {
  IconCatalogueSearch,
  iconPreviewUrl,
  useIconCatalogue,
} from "@/components/icon-catalogue"

export function IconPicker({
  value,
  onChange,
  cachedValue,
}: {
  value: string
  onChange: (slug: string) => void
  cachedValue?: string
}) {
  const [open, setOpen] = useState(false)
  const { catalogue, error, retry } = useIconCatalogue(open)

  const selectedEntry =
    value && value !== cachedValue ? catalogue?.[value] : undefined
  const selectedPreview = selectedEntry
    ? iconPreviewUrl(selectedEntry, value)
    : value
      ? `/icons/${value}`
      : null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 border border-line bg-background p-3">
        {selectedPreview ? (
          <img
            className="h-10 w-10 border border-line bg-surface object-contain p-1"
            src={selectedPreview}
            alt=""
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center border border-line bg-surface text-muted">
            <LuImageOff aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Selected icon</p>
          <p className="mt-1 truncate">{value || "Choose an icon"}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setOpen(!open)
            retry()
          }}
          className="btn text-xs"
        >
          {open ? (
            <LuX aria-hidden className="size-4" />
          ) : (
            <LuImage aria-hidden className="size-4" />
          )}
          <span>{open ? "Close" : "Choose icon"}</span>
        </Button>
      </div>
      {open && (
        <IconCatalogueSearch
          catalogue={catalogue}
          error={error}
          onRetry={retry}
          value={value}
          onSelect={(slug) => {
            onChange(slug)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
