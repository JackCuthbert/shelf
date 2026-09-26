"use client"

import { useEffect, useId, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuImage, LuImageOff } from "react-icons/lu"
import {
  IconCatalogueSearch,
  iconPreviewUrl,
  useIconCatalogue,
} from "@/components/icon-catalogue"

export type IconSelection = {
  source: "dashboard" | "url"
  slug: string
  url: string
}

export function IconPicker({
  value,
  cachedSlug,
  onChange,
}: {
  value: IconSelection
  cachedSlug?: string | null
  onChange: (value: IconSelection) => void
}) {
  const [expanded, setExpanded] = useState(!value.slug)
  const { catalogue, error, retry } = useIconCatalogue(
    value.source === "dashboard",
  )
  const urlId = useId()

  useEffect(() => setExpanded(!value.slug), [value.slug])

  const selectedEntry =
    value.slug && value.slug !== cachedSlug
      ? catalogue?.[value.slug]
      : undefined
  const dashboardPreview = selectedEntry
    ? iconPreviewUrl(selectedEntry, value.slug)
    : value.slug
      ? `/icons/${value.slug}`
      : null

  return (
    <div className="mt-3">
      <div className="flex gap-1">
        <Button
          type="button"
          aria-pressed={value.source === "dashboard"}
          onClick={() => onChange({ ...value, source: "dashboard" })}
          className={`btn text-xs ${value.source === "dashboard" ? "btn-primary" : ""}`}
        >
          <LuImage aria-hidden className="size-4" />
          <span>Dashboard Icons</span>
        </Button>
        <Button
          type="button"
          aria-pressed={value.source === "url"}
          onClick={() => onChange({ ...value, source: "url" })}
          className={`btn text-xs ${value.source === "url" ? "btn-primary" : ""}`}
        >
          <LuImage aria-hidden className="size-4" />
          <span>Image URL</span>
        </Button>
      </div>

      {value.source === "dashboard" ? (
        <>
          <div className="mt-3 border border-line bg-background">
            <div className="flex items-center gap-3 p-3">
              {dashboardPreview ? (
                <img
                  className="h-10 w-10 border border-line bg-surface object-contain p-1"
                  src={dashboardPreview}
                  alt=""
                />
              ) : (
                <span className="grid h-10 w-10 place-items-center border border-line bg-surface text-muted">
                  <LuImageOff aria-hidden className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">Selected icon</p>
                <p className="mt-1 truncate">{value.slug || "Select icon"}</p>
              </div>
              {value.slug && !expanded && (
                <Button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="btn text-xs"
                >
                  Change icon
                </Button>
              )}
            </div>
            {expanded && (
              <IconCatalogueSearch
                embedded
                catalogue={catalogue}
                error={error}
                onRetry={retry}
                value={value.slug}
                onSelect={(slug) => {
                  onChange({ ...value, slug })
                  setExpanded(false)
                }}
              />
            )}
          </div>
        </>
      ) : (
        <div className="mt-3 border border-line bg-background p-3">
          <label htmlFor={urlId} className="text-xs text-muted">
            Image URL
          </label>
          <Input
            id={urlId}
            type="url"
            className="field mt-2"
            placeholder="https://example.home/icon.png"
            value={value.url}
            onChange={(event) =>
              onChange({ ...value, url: event.target.value })
            }
          />
          <div className="mt-3 flex items-center gap-3">
            {value.url ? (
              <img
                className="h-10 w-10 shrink-0 border border-line bg-surface object-contain p-1"
                src={value.url}
                alt=""
              />
            ) : (
              <span className="grid h-10 w-10 shrink-0 place-items-center border border-line bg-surface text-muted">
                <LuImageOff aria-hidden className="size-5" />
              </span>
            )}
            <p className="text-xs text-muted">
              A PNG up to 5 MB is downloaded and cached when you save.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
