"use client"

import { Select } from "@base-ui/react/select"
import { LuCheck, LuChevronDown } from "react-icons/lu"

export type CategoryOption = { id: string; title: string }

/**
 * Category picker built on Base UI's Select. Choosing "Uncategorized" reports
 * `null`; any other choice reports the category id.
 */
export function CategorySelect({
  value,
  categories,
  onChange,
  label,
  className = "",
}: {
  value: string | null
  categories: CategoryOption[]
  onChange: (categoryId: string | null) => void
  label: string
  className?: string
}) {
  const items = [
    { value: "", label: "Uncategorized" },
    ...categories.map((category) => ({
      value: category.id,
      label: category.title,
    })),
  ]

  return (
    <Select.Root
      items={items}
      value={value ?? ""}
      onValueChange={(next) => onChange(next ? String(next) : null)}
    >
      <Select.Trigger
        type="button"
        aria-label={label}
        className={`inline-flex cursor-pointer select-none items-center justify-between gap-2 rounded-[2px] border border-line bg-surface px-2.5 py-2 text-sm text-foreground hover:border-foreground focus-visible:border-focus focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus data-[popup-open]:border-focus ${className}`}
      >
        <Select.Value />
        <Select.Icon>
          <LuChevronDown aria-hidden className="size-4 shrink-0 text-muted" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Positioner
          side="bottom"
          sideOffset={4}
          alignItemWithTrigger={false}
          className="z-[60]"
        >
          <Select.Popup className="min-w-[var(--anchor-width)] rounded-[2px] border border-line bg-surface p-1 shadow-lg focus:outline-none">
            <Select.List className="max-h-[var(--available-height)] overflow-y-auto">
              {items.map((item) => (
                <Select.Item
                  key={item.value || "uncategorized"}
                  value={item.value}
                  className="grid cursor-default select-none grid-cols-[1rem_1fr] items-center gap-2 rounded-[1px] px-2 py-1.5 text-sm data-[highlighted]:bg-surface-alt"
                >
                  <Select.ItemIndicator className="col-start-1">
                    <LuCheck aria-hidden className="size-4 text-accent" />
                  </Select.ItemIndicator>
                  <Select.ItemText className="col-start-2 truncate">
                    {item.label}
                  </Select.ItemText>
                </Select.Item>
              ))}
            </Select.List>
          </Select.Popup>
        </Select.Positioner>
      </Select.Portal>
    </Select.Root>
  )
}
