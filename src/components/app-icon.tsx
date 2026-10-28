import { iconKey, type AppIconReference } from "@/lib/app-icon"

export function AppIcon({
  app,
  className,
  alt,
}: {
  app: AppIconReference
  className?: string
  alt: string
}) {
  const light = iconKey(app)
  const dark = iconKey(app, "dark")
  return (
    <picture className="contents">
      {dark !== light && (
        <source
          media="(prefers-color-scheme: dark)"
          srcSet={`/icons/${dark}`}
        />
      )}
      <img src={`/icons/${light}`} alt={alt} className={className} />
    </picture>
  )
}
