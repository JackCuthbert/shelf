import { headers } from "next/headers"
import type { Metadata } from "next"
import { LuBox, LuEye, LuFolder, LuLayoutDashboard } from "react-icons/lu"
import { AnonymousPageNav } from "@/components/anonymous-page-nav"
import { AdminMenubar } from "@/components/admin-menubar"
import { auth } from "@/lib/auth"
import { appTitle } from "@/lib/page-title"

export const metadata: Metadata = { title: appTitle("Docs") }

export default async function DocsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  return (
    <div className="flex flex-1 flex-col">
      {session ? (
        <AdminMenubar active={null} user={{ name: session.user.name }} />
      ) : (
        <AnonymousPageNav />
      )}
      <main
        className={`mx-auto w-full max-w-5xl flex-1 px-5 sm:px-6 ${session ? "py-10" : "pt-24 pb-10"}`}
      >
        <h1 className="mb-2 text-2xl font-semibold">How Shelf works</h1>
        <p className="mb-8 text-muted">
          Shelf keeps the links you use together in one shared library and on
          personal boards.
        </p>

        <aside className="panel mb-6 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 font-semibold">
            <LuEye aria-hidden className="size-5 text-muted" />
            Visibility
          </h2>
          <p className="text-muted">
            Anyone can see the board list and open any board, even without an
            account. App names, links, descriptions, and icons shown on a board
            are visible too. Treat boards and their apps as public, and do not
            add information that needs to stay private. Signing in protects
            changes, not viewing.
          </p>
        </aside>

        <div className="space-y-4">
          <section className="panel p-4 sm:p-5">
            <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
              <LuBox aria-hidden className="size-5 text-muted" />
              Apps
            </h2>
            <div className="space-y-6 text-muted">
              <section>
                <h3 className="mb-1 font-semibold text-foreground">
                  Shared library
                </h3>
                <p>
                  An app is a saved name, web address, and icon. Apps are shared
                  in one library. You can add an app once to each board and
                  reuse it across boards. Editing the app updates it everywhere.
                  Its address must start with <code>HTTP</code> or{" "}
                  <code>HTTPS</code>, and it opens in a new tab.
                </p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-foreground">
                  Icons
                </h3>
                <p>
                  Choose an icon from Dashboard Icons or upload a custom{" "}
                  <code>PNG</code>{" "}
                  image. Custom images must be 5 MB or smaller. Shelf stores
                  icons locally as PNG files so they keep working if their
                  source is unavailable.
                </p>
              </section>
              <section>
                <h3 className="mb-1 font-semibold text-foreground">
                  Live checks
                </h3>
                <ol className="list-decimal space-y-2 pl-8">
                  <li>
                    When someone opens a board, Shelf checks the apps assigned
                    to it. Results are reused for 10 minutes. There are no
                    background checks while a board is closed.
                  </li>
                  <li>
                    Shelf sends a request to each app and waits up to 15
                    seconds. Any HTTP response counts as responding, including
                    an error page. A network error or timeout counts as not
                    responding.
                  </li>
                  <li>
                    Before the first check, status is unknown. Board tiles show
                    green for responding, red for not responding, and grey for
                    unknown. Responding only means the server replied, not
                    that the app works correctly.
                  </li>
                </ol>
              </section>
            </div>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuLayoutDashboard aria-hidden className="size-5 text-muted" />
              Boards
            </h2>
            <p className="text-muted">
              A board is your ordered selection of shared apps. You own and
              manage your boards, and choose one as your default for{" "}
              <code>/</code>. Anyone with a board link can view it. Only its
              owner can change its name, apps, order, or categories. Changes on
              one board do not change another.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuFolder aria-hidden className="size-5 text-muted" />
              Categories
            </h2>
            <p className="text-muted">
              Categories group apps on a single board, for example by room or
              activity. An app can be in one category on that board, or remain
              uncategorised. Uncategorised apps appear first, followed by
              categories in their saved order. Deleting a category keeps its
              apps on the board as uncategorised apps.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
