export function NoAvailableAppsPlaceholder({
  label = "No apps left to add.",
}: {
  label?: string
}) {
  return (
    <div
      role="status"
      className="mt-3 border border-dashed border-line bg-surface-alt p-4 text-center text-sm text-muted"
    >
      <div
        aria-hidden
        className="mx-auto mb-3 flex max-w-48 items-center gap-3 opacity-50"
      >
        <span className="size-8 shrink-0 bg-line" />
        <span className="h-2 flex-1 bg-line" />
      </div>
      {label}
    </div>
  )
}
