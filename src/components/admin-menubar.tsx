import { SignOutButton } from "@/components/sign-out-button"

export function AdminMenubar({ active }: { active: "boards" | "apps" }) {
  const linkClass = (value: "boards" | "apps") =>
    `border px-2 py-1 transition ${active === value ? "border-accent bg-accent font-semibold text-accent-foreground" : "border-transparent text-muted hover:text-foreground"}`
  return (
    <header className="sticky top-0 z-20 border-b border-line bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
        <div className="flex min-w-0 items-center gap-4">
          <a href="/" className="truncate font-semibold">
            Hometime
          </a>
          <nav
            className="flex items-center gap-4 text-sm"
            aria-label="Admin sections"
          >
            <a
              href="/admin"
              aria-current={active === "boards" ? "page" : undefined}
              className={linkClass("boards")}
            >
              Boards
            </a>
            <a
              href="/admin/apps"
              aria-current={active === "apps" ? "page" : undefined}
              className={linkClass("apps")}
            >
              Apps
            </a>
          </nav>
        </div>
        <SignOutButton />
      </div>
    </header>
  )
}
