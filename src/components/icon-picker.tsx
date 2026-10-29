"use client"

import { useEffect, useId, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuImage, LuImageOff, LuMoon, LuSun } from "react-icons/lu"
import {
  IconCatalogueSearch,
  iconPreviewUrl,
  useIconCatalogue,
  type Catalogue,
} from "@/components/icon-catalogue"

export type IconSelection = {
  source: "dashboard" | "url"
  slug: string
  url: string
}
export type IconSlot = "light" | "dark"
export type SavedIcon = { selection: IconSelection; key: string }

const SLOTS: Record<IconSlot, { label: string; surface: string }> = {
  light: { label: "Light mode", surface: "bg-[#ffffff] text-[#1f2229]" },
  dark: { label: "Dark mode", surface: "bg-[#14181f] text-[#e9ebef]" },
}

function selectionLabel(value: IconSelection) {
  return value.source === "url"
    ? value.url || "Choose image URL"
    : value.slug || "Select icon"
}

export function iconSelectionPreview(
  value: IconSelection,
  saved: SavedIcon | undefined,
  catalogue: Catalogue | null,
) {
  if (
    saved &&
    saved.selection.source === value.source &&
    (value.source === "url"
      ? saved.selection.url === value.url
      : saved.selection.slug === value.slug)
  )
    return `/icons/${saved.key}`
  if (value.source === "url") return value.url || null
  if (!value.slug) return null
  const entry = catalogue?.[value.slug]
  return entry ? iconPreviewUrl(entry, value.slug) : null
}

function Preview({
  src,
  className,
}: {
  src: string | null
  className: string
}) {
  return src ? (
    <img className={`object-contain ${className}`} src={src} alt="" />
  ) : (
    <span className={`grid place-items-center text-muted ${className}`}>
      <LuImageOff aria-hidden className="size-5" />
    </span>
  )
}

export function IconPicker({
  values,
  saved = {},
  slot,
  onSlotChange,
  onChange,
}: {
  values: Record<IconSlot, IconSelection>
  saved?: Partial<Record<IconSlot, SavedIcon>>
  slot: IconSlot
  onSlotChange: (slot: IconSlot) => void
  onChange: (slot: IconSlot, value: IconSelection) => void
}) {
  const value = values[slot]
  const otherSlot: IconSlot = slot === "light" ? "dark" : "light"
  const [expanded, setExpanded] = useState(!value.slug)
  const [notice, setNotice] = useState("")
  const { catalogue, error, retry } = useIconCatalogue(
    values.light.source === "dashboard" || values.dark.source === "dashboard",
  )
  const urlId = useId()

  useEffect(() => setExpanded(!value.slug), [slot, value.slug])
  useEffect(() => setNotice(""), [slot])

  const activePreview = iconSelectionPreview(value, saved[slot], catalogue)
  const set = (next: IconSelection) => onChange(slot, next)

  return (
    <div className="mt-4">
      <span className="block text-xs text-muted">App icon</span>
      <p className="mt-1 text-xs text-muted">
        Choose a slot to edit. Both can use the same icon.
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2.5">
        {(Object.keys(SLOTS) as IconSlot[]).map((name) => (
          <Button
            key={name}
            type="button"
            aria-pressed={slot === name}
            onClick={() => onSlotChange(name)}
            className="min-w-0 border border-line text-left aria-pressed:outline-2 aria-pressed:outline-offset-1 aria-pressed:outline-accent"
          >
            <Preview
              src={iconSelectionPreview(values[name], saved[name], catalogue)}
              className={`h-20 w-full p-3 ${SLOTS[name].surface}`}
            />
            <span className="block px-2.5 py-2 text-xs">
              {name === "light" ? (
                <LuSun aria-hidden className="mr-1 inline size-3.5" />
              ) : (
                <LuMoon aria-hidden className="mr-1 inline size-3.5" />
              )}
              {SLOTS[name].label}
              <small className="mt-0.5 block truncate text-muted">
                {selectionLabel(values[name])}
              </small>
            </span>
          </Button>
        ))}
      </div>

      <div className="mt-3 border border-line bg-background p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <strong className="text-xs">
            Editing {SLOTS[slot].label.toLowerCase()}
          </strong>
          <Button
            type="button"
            className="btn text-xs"
            onClick={() => {
              onChange(otherSlot, { ...value })
              setNotice(`Copied to ${SLOTS[otherSlot].label.toLowerCase()}.`)
            }}
          >
            {slot === "light" ? "Use for dark mode →" : "← Use for light mode"}
          </Button>
        </div>
        <div className="flex gap-1">
          <Button
            type="button"
            aria-pressed={value.source === "dashboard"}
            onClick={() => set({ ...value, source: "dashboard" })}
            className={`btn text-xs ${value.source === "dashboard" ? "btn-primary" : ""}`}
          >
            <LuImage aria-hidden className="size-4" />
            <span>Dashboard Icons</span>
          </Button>
          <Button
            type="button"
            aria-pressed={value.source === "url"}
            onClick={() => set({ ...value, source: "url" })}
            className={`btn text-xs ${value.source === "url" ? "btn-primary" : ""}`}
          >
            <LuImage aria-hidden className="size-4" />
            <span>Image URL</span>
          </Button>
        </div>

        {value.source === "dashboard" ? (
          <div className="mt-3 border border-line bg-surface">
            <div className="flex items-center gap-3 p-3">
              <Preview
                src={activePreview}
                className="h-10 w-10 border border-line bg-surface p-1"
              />
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
                key={slot}
                embedded
                catalogue={catalogue}
                error={error}
                onRetry={retry}
                value={value.slug}
                onSelect={(next) => {
                  set({ ...value, slug: next })
                  setExpanded(false)
                }}
              />
            )}
          </div>
        ) : (
          <div className="mt-3">
            <label htmlFor={urlId} className="text-xs text-muted">
              Image URL
            </label>
            <Input
              id={urlId}
              type="url"
              className="field mt-2"
              placeholder="https://example.home/icon.png"
              value={value.url}
              onChange={(event) => set({ ...value, url: event.target.value })}
            />
            <p className="mt-2 text-xs text-muted">
              A PNG up to 5 MB is downloaded and cached when you save.
            </p>
          </div>
        )}
        <p role="status" className="mt-2 text-xs text-muted">
          {notice}
        </p>
      </div>
    </div>
  )
}
