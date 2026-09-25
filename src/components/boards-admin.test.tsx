import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({})
  return {
    trpc: {
      useUtils: () => ({ boards: { list: { invalidate: () => {} } } }),
      boards: {
        list: {
          useQuery: (_input: unknown, options: { initialData: unknown }) => ({
            data: options.initialData,
          }),
        },
        create: { useMutation },
        rename: { useMutation },
        delete: { useMutation },
        setDefault: { useMutation },
        assign: { useMutation },
        unassign: { useMutation },
        move: { useMutation },
        setAssignmentCategory: { useMutation },
        createCategory: { useMutation },
        updateCategory: { useMutation },
        moveCategory: { useMutation },
        deleteCategory: { useMutation },
      },
      apps: {
        list: {
          useQuery: (_input: unknown, options: { initialData: unknown }) => ({
            data: options.initialData,
          }),
        },
        create: { useMutation },
        update: { useMutation },
      },
    },
  }
})

import { BoardsAdmin } from "./boards-admin"
import { BoardsListAdmin } from "./boards-list-admin"
import { CreateAppMenubarAction } from "./create-app-menubar-action"
import { AdminMenubar } from "./admin-menubar"

afterEach(() => vi.unstubAllGlobals())

it("renders the same board link during server and browser initial renders", () => {
  const props = {
    initialBoards: [
      {
        id: "board-1",
        nanoid: "public-id",
        name: "Home",
        ownerId: "user-1",
        createdAt: "",
        updatedAt: "",
        categories: [],
        apps: [],
      },
    ],
    initialApps: [],
  }
  const markup = () => renderToStaticMarkup(<BoardsAdmin {...props} />)
  const link = () =>
    markup().match(/<a[^>]*href="\/board\/public-id"[^>]*>.*?<\/a>/)?.[0]

  const serverLink = link()
  vi.stubGlobal("window", { location: { origin: "http://localhost:3000" } })
  const browserLink = link()

  expect(serverLink).toContain("/board/public-id")
  expect(serverLink).toContain('target="_blank"')
  expect(serverLink).toContain('rel="noreferrer"')
  expect(browserLink).toBe(serverLink)
  expect(markup()).toContain('<h1 class="truncate text-xl font-semibold"><a')
  expect(markup()).toContain('target="_blank"')
})

it("marks the default board and disables its set-default control", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [],
        },
      ]}
      initialApps={[]}
      initialDefaultBoardId="board-1"
    />,
  )
  expect(html).toContain('aria-label="Set as default"')
  expect(html).toContain("disabled")
  expect(html).not.toContain("border-t border-line pt-4")
  expect(html).toContain("Add category")
  expect(html).not.toContain(">Apps</h4>")
  expect(html).not.toContain('class="panel p-4"')
})

it("renders icon-only move controls with accessible labels", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: null,
              position: 0,
              app: {
                id: "plex",
                name: "Plex",
                description: "",
                url: "https://plex.example",
                iconSource: "dashboard",
                iconSlug: "plex",
                customIconUrl: null,
                iconHash: null,
                status: "unknown",
                lastCheckedAt: null,
                lastError: null,
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )
  expect(html).toContain('aria-label="Edit Plex"')
  expect(html).toContain('aria-label="Move Plex up"')
  expect(html).toContain('aria-label="Move Plex down"')
  expect(html).not.toContain(">Edit<")
  expect(html).not.toContain(">Move up<")
  expect(html).not.toContain(">Move down<")
})

it("shows assigned app icons without a surrounding box", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: null,
              position: 0,
              app: {
                id: "plex",
                name: "Plex",
                description: "",
                url: "https://plex.example",
                iconSource: "dashboard",
                iconSlug: "plex",
                customIconUrl: null,
                iconHash: null,
                status: "unknown",
                lastCheckedAt: null,
                lastError: null,
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )
  const icon = html.match(/<img src="\/icons\/plex"[^>]*>/)?.[0]
  expect(icon).toBeDefined()
  expect(icon).not.toContain("border")
  expect(icon).not.toContain("bg-surface")
  expect(html).toContain('aria-label="Uncategorised"')
  expect(html).toContain('aria-label="Add app to Uncategorised"')
  expect(html.match(/>Add app</g)).toHaveLength(1)
  expect(html).not.toContain("Add board")
})

it("shows an add-app Uncategorised section when a board has no categories or apps", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [],
        },
      ]}
      initialApps={[]}
    />,
  )

  expect(html).toContain('aria-label="Uncategorised"')
  expect(html).toContain('aria-label="Add app to Uncategorised"')
  expect(html).toContain('aria-label="About Uncategorised"')
  expect(html).toContain("No apps assigned.")
  expect(html.match(/>Add app</g)).toHaveLength(1)
})

it("separates admin app rows with spacing and a hover state instead of borders", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: null,
              position: 0,
              app: {
                id: "plex",
                name: "Plex",
                description: "",
                url: "https://plex.example",
                iconSource: "dashboard",
                iconSlug: "plex",
                customIconUrl: null,
                iconHash: null,
                status: "unknown",
                lastCheckedAt: null,
                lastError: null,
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )
  expect(html).not.toContain("border border-line")
  const row = html.match(/<li class="[^"]*hover:bg-surface-alt\/50[^"]*"/)?.[0]
  expect(row).toBeDefined()
  expect(row).not.toContain("border")
  expect(row).toContain("hover:bg-surface-alt/50")
  expect(html).not.toContain('class="space-y-1"')
})

it("stacks admin app rows on phones and lays them out inline from sm up", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [
            {
              id: "movies",
              title: "Movies",
              description: "",
              boardId: "board-1",
              position: 0,
              createdAt: "",
              updatedAt: "",
            },
          ],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: "movies",
              position: 0,
              app: {
                id: "plex",
                name: "Plex",
                description: "",
                url: "https://plex.example",
                iconSource: "dashboard",
                iconSlug: "plex",
                customIconUrl: null,
                iconHash: null,
                status: "unknown",
                lastCheckedAt: null,
                lastError: null,
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )
  const row = html.match(/<li class="flex flex-col[^"]*"/)?.[0]
  expect(row).toBeDefined()
  expect(row).toContain("sm:flex-row")
  expect(row).toContain("sm:items-center")
  const select = html.match(
    /<button[^>]*aria-label="Category for Plex"[^>]*>/,
  )?.[0]
  expect(select).toContain('role="combobox"')
  expect(select).toContain('aria-label="Category for Plex"')
})

it("uses a custom select to move an app between categories", () => {
  const app = (id: string, name: string) => ({
    id,
    name,
    description: "",
    url: `https://${id}.example`,
    iconSource: "dashboard",
    iconSlug: id,
    customIconUrl: null,
    iconHash: null,
    status: "unknown",
    lastCheckedAt: null,
    lastError: null,
    createdAt: "",
    updatedAt: "",
  })
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [
            {
              id: "movies",
              title: "Movies",
              description: "",
              boardId: "board-1",
              position: 0,
              createdAt: "",
              updatedAt: "",
            },
          ],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: "movies",
              position: 0,
              app: app("plex", "Plex"),
            },
            {
              boardId: "board-1",
              appId: "sonarr",
              categoryId: null,
              position: 1,
              app: app("sonarr", "Sonarr"),
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )

  expect(html).not.toContain("<select")
  const plex = html.match(
    /<button[^>]*aria-label="Category for Plex"[^>]*>[\s\S]*?<\/button>/,
  )?.[0]
  expect(plex).toBeDefined()
  expect(plex).toContain('role="combobox"')
  expect(plex).toContain('aria-label="Category for Plex"')
  const sonarr = html.match(
    /<button[^>]*aria-label="Category for Sonarr"[^>]*>[\s\S]*?<\/button>/,
  )?.[0]
  expect(sonarr).toContain('aria-label="Category for Sonarr"')
})

it("offers board creation on the index and keeps app creation in the menubar", () => {
  const indexHtml = renderToStaticMarkup(
    <BoardsListAdmin initialBoards={[]} initialDefaultBoardId={null} />,
  )
  const detailHtml = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "short-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [],
          apps: [],
        },
      ]}
      initialApps={[]}
      boardNanoid="short-id"
    />,
  )
  expect(indexHtml).toContain("Create board")
  expect(indexHtml).not.toContain("Create app")
  expect(detailHtml).not.toContain("Create app")
  expect(detailHtml).not.toContain("Create board")
  expect(indexHtml).not.toContain("Add board")
  expect(detailHtml).toContain("Add app to Uncategorised")
  expect(indexHtml).not.toContain("New board name")
})

it("shows a plus action with a Create app tooltip", () => {
  const html = renderToStaticMarkup(<CreateAppMenubarAction />)
  expect(html).toContain('aria-label="Create app"')
  expect(html).toContain('title="Create app"')
  expect(html).toContain("<svg")
})

it("includes Create app before the user menu in the shared admin menubar", () => {
  const html = renderToStaticMarkup(
    <AdminMenubar active="account" user={{ name: "Alex" }} />,
  )
  expect(html.indexOf('aria-label="Create app"')).toBeGreaterThanOrEqual(0)
  expect(html.indexOf('aria-label="Create app"')).toBeLessThan(
    html.indexOf("Alex"),
  )
})

it("links the edit action with the board's short id", () => {
  const html = renderToStaticMarkup(
    <BoardsListAdmin
      initialBoards={[
        {
          id: "internal-cuid-value",
          nanoid: "short-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
        },
      ]}
      initialDefaultBoardId={null}
    />,
  )
  expect(html).toContain('href="/admin/boards/short-id"')
  expect(html).not.toContain('href="/admin/boards/internal-cuid-value"')
  expect(html).toContain('href="/board/short-id" target="_blank"')
  expect(html).not.toContain(">/board/short-id</a>")
})

it("keeps each category's controls and apps together in one section", () => {
  const html = renderToStaticMarkup(
    <BoardsAdmin
      initialBoards={[
        {
          id: "board-1",
          nanoid: "public-id",
          name: "Home",
          ownerId: "user-1",
          createdAt: "",
          updatedAt: "",
          categories: [
            {
              id: "movies",
              title: "Movies",
              description: "Films we watch",
              boardId: "board-1",
              position: 0,
              createdAt: "",
              updatedAt: "",
            },
          ],
          apps: [
            {
              boardId: "board-1",
              appId: "plex",
              categoryId: "movies",
              position: 0,
              app: {
                id: "plex",
                name: "Plex",
                description: "",
                url: "https://plex.example",
                iconSource: "dashboard",
                iconSlug: "plex",
                customIconUrl: null,
                iconHash: null,
                status: "unknown",
                lastCheckedAt: null,
                lastError: null,
                createdAt: "",
                updatedAt: "",
              },
            },
          ],
        },
      ]}
      initialApps={[]}
    />,
  )

  const section = html.match(
    /<section[^>]*aria-label="Movies"[\s\S]*?<\/section>/,
  )?.[0]
  expect(section).toBeDefined()
  expect(section).toContain('class="panel"')
  expect(html).not.toContain('class="panel bg-transparent"')
  expect(section).toContain("Films we watch")
  expect(section).toContain('aria-label="Edit category Movies"')
  expect(section).toContain('aria-label="Move category Movies up"')
  expect(section).toContain('aria-label="Move category Movies down"')
  expect(section).toContain('aria-label="Add app to Movies"')
  expect(section).toContain("Plex")
  expect(section).toContain('aria-label="Move Plex up"')
  expect(html).toContain('aria-label="Uncategorised"')
  expect(html).toContain('aria-label="Add app to Uncategorised"')
})
