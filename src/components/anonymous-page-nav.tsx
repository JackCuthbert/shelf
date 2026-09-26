import { LuLayoutDashboard, LuLogIn } from "react-icons/lu"

export function AnonymousPageNav({
  showBoards = true,
  showSignIn = true,
}: {
  showBoards?: boolean
  showSignIn?: boolean
}) {
  if (!showBoards && !showSignIn) return null

  return (
    <nav
      aria-label="Page navigation"
      className="pointer-events-none fixed inset-x-0 top-4 z-50 flex items-start justify-between px-4 sm:px-6"
    >
      {showBoards ? (
        <a href="/" className="btn pointer-events-auto gap-1.5 text-xs shadow-sm">
          <LuLayoutDashboard aria-hidden className="size-4" />
          Boards
        </a>
      ) : (
        <span aria-hidden />
      )}
      {showSignIn && (
        <a
          href="/login"
          className="btn pointer-events-auto gap-1.5 text-xs shadow-sm"
        >
          <LuLogIn aria-hidden className="size-4" />
          Sign in
        </a>
      )}
    </nav>
  )
}
