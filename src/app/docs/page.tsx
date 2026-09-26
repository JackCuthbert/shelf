import { headers } from "next/headers"
import type { Metadata } from "next"
import {
  LuActivity,
  LuBox,
  LuDownload,
  LuEye,
  LuFolder,
  LuHeart,
  LuLayoutDashboard,
  LuServer,
  LuUserRound,
} from "react-icons/lu"
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
        <h1 className="mb-3 text-2xl font-semibold">Shelf</h1>
        <p className="mb-3 max-w-3xl text-base text-muted">
          Shelf is a fast landing page for the apps and services you host
          yourself. It gives your homelab one simple place to start.
        </p>
        <p className="mb-8 max-w-3xl text-muted">
          Keep your links and service status in one place. There are no widgets
          or layouts to configure, so you can find an app and get on with what
          you came to do.
        </p>

        <aside className="panel mb-4 p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <LuEye aria-hidden className="size-5 text-muted" />
            Visibility
          </h2>
          <p className="text-muted">
            Every board is public and listed on the homepage at <code>/</code>.
            Anyone can view a board and the apps on it.
          </p>
          <p className="mt-3 text-muted">
            Apps are public and shared by everyone using Shelf. Any signed-in
            user can create one, but only its owner can edit or delete it. Shelf
            prevents new apps from reusing a URL, so add the existing app to
            your board if someone has already created it. Editing or deleting an
            app affects every board that uses it.
          </p>
          <p className="mt-3 text-muted">
            Only you can manage your own boards, including their apps,
            categories, and order. Other people can view them but cannot change
            them.
          </p>
        </aside>

        <div className="space-y-4">
          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuUserRound aria-hidden className="size-5 text-muted" />
              Getting started
            </h2>
            <ol className="list-decimal space-y-2 pl-8 text-muted">
              <li>Create a board for the apps you want to see together.</li>
              <li>Create apps, then put them on the board.</li>
              <li>
                Open your board to use those links and check their status.
              </li>
            </ol>
            <p className="mt-4 text-muted">
              You can change your name, email, and password in Account settings.
              The person running Shelf can also allow more people to sign up or
              set up OpenID Connect as another way to sign in.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuLayoutDashboard aria-hidden className="size-5 text-muted" />
              Boards
            </h2>
            <p className="text-muted">
              A board groups the app links you want to see together. You can
              make several boards and choose which one appears at <code>/</code>
              when you sign in. Use the board switcher to move between them.
              Each board has its own public link, and only its owner can change
              the apps and their order. Boards work on phones and desktops and
              follow your device's light or dark setting.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuBox aria-hidden className="size-5 text-muted" />
              Apps and icons
            </h2>
            <p className="text-muted">
              Save each app's name, web address, icon, and optional description
              in the Apps page. Its tile opens the address in a new tab. Use
              View in the Apps list to see its details and owner. You can put an
              app on several boards, but only once on each one. Changes to an
              app appear on every board that uses it. Deleting the app removes
              it from those boards too.
            </p>
            <p className="mt-4 text-muted">
              Choose an icon from Dashboard Icons or enter the URL of a{" "}
              <code>PNG</code> image up to 5 MB. Shelf saves the icon locally.
              Hover over a tile or focus it with a keyboard to see its
              description. On a touch screen, use the info button.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuFolder aria-hidden className="size-5 text-muted" />
              Categories and search
            </h2>
            <p className="text-muted">
              Use categories to group apps on a board, such as Media or Tools.
              Apps without a category appear first, followed by categories in
              your chosen order. Each app can belong to one category per board.
              If you delete a category, its apps stay on the board.
            </p>
            <p className="mt-4 text-muted">
              Search finds apps by name on the board you are viewing. It shows
              the closest matches first, even if you make a small spelling
              mistake.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuActivity aria-hidden className="size-5 text-muted" />
              Live checks
            </h2>
            <ol className="list-decimal space-y-2 pl-8 text-muted">
              <li>
                Opening a board checks its apps. Shelf keeps each result for 10
                minutes. It does not check boards in the background.
              </li>
              <li>
                If an app's web server replies, even with an error page, the
                check succeeds. A connection failure or 15-second timeout fails.
              </li>
              <li>
                A green dot means the server replied, red means it did not, and
                grey means no check has finished yet. The dot cannot tell you
                whether the app itself works correctly.
              </li>
            </ol>
            <p className="mt-4 text-muted">
              Use Check now on the Apps page or an app's detail page to refresh
              one app immediately.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuDownload aria-hidden className="size-5 text-muted" />
              Import from Homarr
            </h2>
            <p className="text-muted">
              If you already use Homarr, you can import its app links from the
              Apps page. Enter your Homarr address and API key, review the
              details, then choose icons and save the apps you want. Boards,
              categories, and widgets are not imported. Shelf does not save your
              API key.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuServer aria-hidden className="size-5 text-muted" />
              Hosting and data
            </h2>
            <p className="text-muted">
              Shelf runs in one Docker container. Mount <code>/data</code> to
              keep your database and icons when you update Shelf. Include that
              directory in your backups.
            </p>
          </section>

          <section className="panel p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <LuHeart aria-hidden className="size-5 text-muted" />
              Inspiration and prior art
            </h2>
            <p className="text-muted">
              Shelf draws inspiration from{" "}
              <a
                href="https://homarr.dev/"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
              >
                Homarr
              </a>{" "}
              and{" "}
              <a
                href="https://gethomepage.dev/"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-line underline-offset-2 hover:decoration-foreground"
              >
                Homepage
              </a>
              .
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
