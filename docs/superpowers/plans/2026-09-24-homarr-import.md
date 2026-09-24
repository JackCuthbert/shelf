# Homarr App Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import apps from an existing Homarr instance into Shelf's shared app library through a two-step modal wizard.

**Architecture:** A server-only Homarr client fetches `GET <base>/api/apps` with a request-scoped `ApiKey` header and normalizes the records. A protected tRPC `imports.previewHomarr` mutation exposes that to a client wizard. The wizard reviews the apps, chooses Dashboard Icons with auto-suggested slugs plus a bundled placeholder, and saves each app through the existing `apps.create` path.

**Tech Stack:** Next.js App Router, React 19, tRPC, Zod, Vitest, Base UI, Tailwind.

**Spec:** `spec/homarr-import.md`

## Global Constraints

- Single Docker image, Next.js App Router, Node.js runtime; SQLite via Prisma is the only database.
- tRPC defines typed procedures; authorization is enforced server-side. New procedures are `protectedProcedure`.
- The Homarr URL and API key are request-scoped: never persisted, logged, returned to the client, or placed in a URL.
- Only HTTP(S) app URLs are accepted; private household hosts remain allowed.
- Icons are served from the local icon route; only explicitly chosen Dashboard Icons are downloaded and cached.
- Existing app CRUD, validation, icon caching, boards, and search behavior stay unchanged.
- npm modules use the latest tagged version at install time; commit the lockfile.
- Conventional Commits; keep changes matching surrounding style (oxfmt formatting, Tailwind utility classes).

## Review Focus

Failure modes the spec implies that no single task's happy-path test covers. Each has a test in the task that owns the code:

1. Homarr served under a subpath or with a trailing slash — the base URL must normalize to `<origin><path>/api/apps` without doubling or dropping slashes (Task 3).
2. An empty Homarr instance (`[]`) — the review step must show a clear empty state instead of a Save that does nothing (Task 7).
3. A very large Homarr response or app list — must be rejected before use, not crash or freeze the server (Task 3).
4. The icon catalogue is unavailable during review — suggested slugs must be cleared gracefully and manual selection plus placeholder saves must still work (Task 4, Task 6).
5. Odd records: whitespace-only URLs, missing/blank descriptions, non-string ids, non-HTTP(S) `href` — normalization must produce valid Shelf records or mark rows non-importable (Task 3).

---

### Task 1: Placeholder icon

**Files:**

- Create: `src/lib/placeholder-icon.ts`
- Modify: `src/lib/icon-cache.ts`
- Modify: `src/app/icons/[slug]/route.ts`
- Create: `src/app/icons/[slug]/route.test.ts`
- Test: `src/lib/icon-cache.test.ts` (append)

**Interfaces:**

- Consumes: `iconSlugSchema` from `@/lib/app-validation`.
- Produces: `PLACEHOLDER_ICON_SLUG = "placeholder"` and `PLACEHOLDER_ICON_SVG` (string) from `@/lib/placeholder-icon`.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/icon-cache.test.ts` (add the import at the top):

```ts
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"
```

```ts
it("keeps the placeholder available without downloading or writing a file", async () => {
  const path = await setup()
  const download = vi.fn(async () => png)
  const cache = createIconCache(path, download)
  await cache.ensure(PLACEHOLDER_ICON_SLUG)
  await cache.remove(PLACEHOLDER_ICON_SLUG)
  expect(download).not.toHaveBeenCalled()
  expect(await readdir(path)).toEqual([])
})
```

Create `src/app/icons/[slug]/route.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { PLACEHOLDER_ICON_SLUG } from "@/lib/placeholder-icon"
import { GET } from "./route"

function context(slug: string) {
  return { params: Promise.resolve({ slug }) } as never
}

describe("GET /icons/[slug]", () => {
  it("serves the bundled placeholder as an SVG without touching the icon directory", async () => {
    const response = await GET(
      new Request(`http://localhost/icons/${PLACEHOLDER_ICON_SLUG}`),
      context(PLACEHOLDER_ICON_SLUG),
    )
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("image/svg+xml")
    expect(await response.text()).toContain("<svg")
  })

  it("returns 404 for an invalid slug", async () => {
    const response = await GET(
      new Request("http://localhost/icons/Not_A_Slug"),
      context("Not_A_Slug"),
    )
    expect(response.status).toBe(404)
  })
})
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/lib/icon-cache.test.ts src/app/icons/'[slug]'/route.test.ts`
Expected: FAIL — `src/lib/placeholder-icon.ts` cannot be found, and the route does not recognise the placeholder slug.

- [ ] **Step 3: Implement the placeholder module**

Create `src/lib/placeholder-icon.ts`:

```ts
export const PLACEHOLDER_ICON_SLUG = "placeholder"

export const PLACEHOLDER_ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="No icon"><rect x="9" y="9" width="46" height="46" rx="11" fill="none" stroke="#9ca3af" stroke-width="3"/><circle cx="25" cy="26" r="4" fill="#9ca3af"/><path d="M16 45l12-12 8 8 12-14" fill="none" stroke="#9ca3af" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
```

- [ ] **Step 4: Make the icon cache skip the placeholder**

In `src/lib/icon-cache.ts`, add the import and early returns:

```ts
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"
```

```ts
    async ensure(slug: string): Promise<boolean> {
      iconSlugSchema.parse(slug)
      if (slug === PLACEHOLDER_ICON_SLUG) return false
      await mkdir(directory, { recursive: true })
```

```ts
    async remove(slug: string): Promise<void> {
      iconSlugSchema.parse(slug)
      if (slug === PLACEHOLDER_ICON_SLUG) return
      await rm(join(directory, `${slug}.png`), { force: true })
    },
```

- [ ] **Step 5: Serve the placeholder from the icon route**

In `src/app/icons/[slug]/route.ts`, add the import and a branch after slug validation:

```ts
import {
  PLACEHOLDER_ICON_SLUG,
  PLACEHOLDER_ICON_SVG,
} from "@/lib/placeholder-icon"
```

```ts
if (!iconSlugSchema.safeParse(slug).success)
  return new Response("Not found", { status: 404 })
if (slug === PLACEHOLDER_ICON_SLUG)
  return new Response(PLACEHOLDER_ICON_SVG, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  })
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/lib/icon-cache.test.ts src/app/icons/'[slug]'/route.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/placeholder-icon.ts src/lib/icon-cache.ts src/lib/icon-cache.test.ts src/app/icons
git commit -m "feat: add a bundled placeholder icon"
```

---

### Task 2: Detect a Dashboard Icons slug from a Homarr icon URL

**Files:**

- Create: `src/lib/homarr-icon.ts`
- Test: `src/lib/homarr-icon.test.ts`

**Interfaces:**

- Consumes: `iconSlugSchema` from `@/lib/app-validation`.
- Produces: `detectIconSlug(iconUrl: string): string | null`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/homarr-icon.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { detectIconSlug } from "./homarr-icon"

describe("detectIconSlug", () => {
  it.each([
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/home-assistant.png",
      "home-assistant",
    ],
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/plex.svg",
      "plex",
    ],
    [
      "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/dashdot.png",
      "dashdot",
    ],
    [
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/jellyfin.png?x=1",
      "jellyfin",
    ],
  ])("detects %s as %s", (url, slug) => {
    expect(detectIconSlug(url)).toBe(slug)
  })

  it.each([
    "https://example.com/icon.png",
    "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/Not_A_Slug.png",
    "",
  ])("returns null for %s", (url) => {
    expect(detectIconSlug(url)).toBeNull()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/homarr-icon.test.ts`
Expected: FAIL — `./homarr-icon` cannot be found.

- [ ] **Step 3: Implement the detector**

Create `src/lib/homarr-icon.ts`:

```ts
import { iconSlugSchema } from "./app-validation"

const DASHBOARD_ICONS_PATTERN =
  /(?:homarr-labs|walkxcode)\/dashboard-icons(?:@[^/]+)?\/(?:png|svg)\/([a-z0-9]+(?:-[a-z0-9]+)*)\.(?:png|svg)(?:[?#]|$)/i

export function detectIconSlug(iconUrl: string): string | null {
  const match = DASHBOARD_ICONS_PATTERN.exec(iconUrl)
  if (!match) return null
  const slug = match[1].toLowerCase()
  return iconSlugSchema.safeParse(slug).success ? slug : null
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/homarr-icon.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/homarr-icon.ts src/lib/homarr-icon.test.ts
git commit -m "feat: detect Dashboard Icons slugs from Homarr icon URLs"
```

---

### Task 3: Homarr client

**Files:**

- Create: `src/lib/homarr.ts`
- Test: `src/lib/homarr.test.ts`

**Interfaces:**

- Produces:
  - `type HomarrApp = { sourceId: string; name: string; description: string; url: string; iconUrl: string; importable: boolean; reason: string | null }`
  - `class HomarrError extends Error`
  - `homarrConnectionSchema` (Zod object `{ baseUrl: string; apiKey: string }`)
  - `type HomarrConnection = z.infer<typeof homarrConnectionSchema>`
  - `normalizeHomarrBaseUrl(value: string): string`
  - `fetchHomarrApps(input: HomarrConnection, options?: { fetchImpl?: typeof fetch }): Promise<HomarrApp[]>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/homarr.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import { fetchHomarrApps, HomarrError, normalizeHomarrBaseUrl } from "./homarr"

function jsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init,
  })
}

const connection = { baseUrl: "https://homarr.home", apiKey: "abc123.token" }

describe("normalizeHomarrBaseUrl", () => {
  it("keeps a subpath and removes trailing slashes", () => {
    expect(normalizeHomarrBaseUrl("https://homarr.home/dash/")).toBe(
      "https://homarr.home/dash",
    )
  })

  it.each([
    ["not a url", "valid"],
    ["ftp://homarr.home", "HTTP or HTTPS"],
    ["https://user:pass@homarr.home", "username and password"],
  ])("rejects %s", (value, message) => {
    expect(() => normalizeHomarrBaseUrl(value)).toThrowError(message)
  })
})

describe("fetchHomarrApps", () => {
  it("requests the fixed apps path with the API key and normalizes records", async () => {
    const fetchImpl = vi.fn(async () =>
      jsonResponse([
        {
          id: 7,
          name: "Plex",
          description: " Movies ",
          href: "https://plex.home/",
          iconUrl:
            "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
        },
        { id: 8, name: "Editor", href: "vscode://file", description: null },
        { id: 9, name: "Broken", href: "" },
      ]),
    )
    const apps = await fetchHomarrApps(connection, { fetchImpl })
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://homarr.home/api/apps",
      expect.objectContaining({
        headers: { ApiKey: "abc123.token", Accept: "application/json" },
      }),
    )
    expect(apps[0]).toEqual({
      sourceId: "7",
      name: "Plex",
      description: "Movies",
      url: "https://plex.home/",
      iconUrl:
        "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
      importable: true,
      reason: null,
    })
    expect(apps[1]).toMatchObject({
      sourceId: "8",
      importable: false,
      reason: "Homarr URL is not HTTP(S).",
    })
    expect(apps[2]).toMatchObject({
      sourceId: "9",
      importable: false,
      reason: "Homarr has no URL for this app.",
    })
  })

  it("returns an empty list for an empty Homarr instance", async () => {
    const apps = await fetchHomarrApps(connection, {
      fetchImpl: async () => jsonResponse([]),
    })
    expect(apps).toEqual([])
  })

  it.each([
    [401, "rejected the API key"],
    [403, "rejected the API key"],
    [404, "No Homarr API was found"],
    [500, "HTTP 500"],
  ])("maps HTTP %s to a clear error", async (status, message) => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => jsonResponse({}, { status }),
      }),
    ).rejects.toThrowError(message)
  })

  it("reports an unreachable host", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => {
          throw new TypeError("fetch failed")
        },
      }),
    ).rejects.toThrowError("Could not reach the Homarr instance")
  })

  it("rejects a malformed response body", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => new Response("<html>", { status: 200 }),
      }),
    ).rejects.toThrowError(HomarrError)
  })

  it("rejects too many apps before returning them", async () => {
    const many = Array.from({ length: 1_001 }, (_, index) => ({
      id: index,
      name: `App ${index}`,
      href: "https://app.home",
    }))
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => jsonResponse(many),
      }),
    ).rejects.toThrowError("too many apps")
  })

  it("rejects an oversized response", async () => {
    await expect(
      fetchHomarrApps(connection, {
        fetchImpl: async () => new Response("a".repeat(10 * 1024 * 1024 + 1)),
      }),
    ).rejects.toThrowError("too large")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/homarr.test.ts`
Expected: FAIL — `./homarr` cannot be found.

- [ ] **Step 3: Implement the client**

Create `src/lib/homarr.ts`:

```ts
import { z } from "zod"

export type HomarrApp = {
  sourceId: string
  name: string
  description: string
  url: string
  iconUrl: string
  importable: boolean
  reason: string | null
}

export class HomarrError extends Error {}

const REQUEST_TIMEOUT_MS = 15_000
const MAX_APPS = 1_000
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024

export const homarrConnectionSchema = z.object({
  baseUrl: z.string().trim().min(1, "Enter the Homarr address."),
  apiKey: z.string().trim().min(1, "Enter a Homarr API key."),
})

export type HomarrConnection = z.infer<typeof homarrConnectionSchema>

const homarrAppSchema = z
  .object({
    id: z.union([z.string(), z.number()]).optional(),
    name: z.string().optional(),
    description: z.string().nullish(),
    href: z.string().nullish(),
    iconUrl: z.string().nullish(),
  })
  .passthrough()

export function normalizeHomarrBaseUrl(value: string): string {
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    throw new HomarrError("Enter a valid HTTP(S) Homarr address.")
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new HomarrError("The Homarr address must use HTTP or HTTPS.")
  if (parsed.username || parsed.password)
    throw new HomarrError(
      "Remove the username and password from the Homarr address.",
    )
  const path = parsed.pathname.replace(/\/+$/, "")
  return `${parsed.origin}${path}`
}

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === "http:" || parsed.protocol === "https:"
  } catch {
    return false
  }
}

function normalizeHomarrApp(
  record: z.infer<typeof homarrAppSchema>,
): HomarrApp {
  const name = (record.name ?? "").trim()
  const description = (record.description ?? "").trim().slice(0, 280)
  const href = (record.href ?? "").trim()
  const iconUrl = (record.iconUrl ?? "").trim()
  const sourceId = record.id === undefined ? "" : String(record.id)
  const base = { sourceId, name, description, url: href, iconUrl }
  if (name.length === 0)
    return {
      ...base,
      importable: false,
      reason: "Homarr has no name for this app.",
    }
  if (!isHttpUrl(href))
    return {
      ...base,
      importable: false,
      reason: href
        ? "Homarr URL is not HTTP(S)."
        : "Homarr has no URL for this app.",
    }
  return {
    ...base,
    url: new URL(href).toString(),
    importable: true,
    reason: null,
  }
}

async function readLimited(response: Response): Promise<string> {
  const declared = Number(response.headers.get("content-length") ?? "")
  if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES)
    throw new HomarrError("Homarr returned a response that is too large.")
  const text = await response.text()
  if (Buffer.byteLength(text) > MAX_RESPONSE_BYTES)
    throw new HomarrError("Homarr returned a response that is too large.")
  return text
}

export async function fetchHomarrApps(
  input: HomarrConnection,
  options: { fetchImpl?: typeof fetch } = {},
): Promise<HomarrApp[]> {
  const doFetch = options.fetchImpl ?? fetch
  const base = normalizeHomarrBaseUrl(input.baseUrl)

  let response: Response
  try {
    response = await doFetch(`${base}/api/apps`, {
      headers: { ApiKey: input.apiKey.trim(), Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      redirect: "follow",
    })
  } catch {
    throw new HomarrError(
      "Could not reach the Homarr instance at that address.",
    )
  }

  if (response.status === 401 || response.status === 403)
    throw new HomarrError("Homarr rejected the API key.")
  if (response.status === 404)
    throw new HomarrError("No Homarr API was found at that address.")
  if (!response.ok)
    throw new HomarrError(`Homarr responded with HTTP ${response.status}.`)

  const body = await readLimited(response)
  let parsed: unknown
  try {
    parsed = JSON.parse(body)
  } catch {
    throw new HomarrError("Homarr returned an unexpected response.")
  }

  const records = z.array(homarrAppSchema).safeParse(parsed)
  if (!records.success)
    throw new HomarrError("Homarr returned an unexpected response.")
  if (records.data.length > MAX_APPS)
    throw new HomarrError("Homarr returned too many apps to import.")
  return records.data.map(normalizeHomarrApp)
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/homarr.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/homarr.ts src/lib/homarr.test.ts
git commit -m "feat: add a server-side Homarr apps client"
```

---

### Task 4: Import row model and helpers

**Files:**

- Create: `src/lib/homarr-import.ts`
- Test: `src/lib/homarr-import.test.ts`

**Interfaces:**

- Consumes: `HomarrApp` (type) from `@/lib/homarr`; `detectIconSlug` from `@/lib/homarr-icon`.
- Produces:
  - `type ImportRow = { key: string; name: string; description: string; url: string; iconUrl: string; iconSlug: string; importable: boolean; reason: string | null; selected: boolean }`
  - `toImportRows(apps: HomarrApp[]): ImportRow[]`
  - `clearUnknownIcons(rows: ImportRow[], known: Set<string>): ImportRow[]`
  - `selectedImportRows(rows: ImportRow[]): ImportRow[]`
  - `applyImported(rows: ImportRow[], importedKeys: Set<string>): ImportRow[]`
  - `type ImportFailure = { name: string; reason: string }`
  - `runImport(rows: ImportRow[], create: (input: { name: string; description: string; url: string; iconSlug: string }) => Promise<unknown>): Promise<{ importedKeys: Set<string>; failures: ImportFailure[] }>`

- [ ] **Step 1: Write the failing test**

Create `src/lib/homarr-import.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest"
import {
  applyImported,
  clearUnknownIcons,
  runImport,
  selectedImportRows,
  toImportRows,
} from "./homarr-import"
import type { HomarrApp } from "./homarr"

const apps: HomarrApp[] = [
  {
    sourceId: "1",
    name: "Plex",
    description: "",
    url: "https://plex.home/",
    iconUrl:
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
    importable: true,
    reason: null,
  },
  {
    sourceId: "2",
    name: "Editor",
    description: "",
    url: "vscode://file",
    iconUrl: "",
    importable: false,
    reason: "Homarr URL is not HTTP(S).",
  },
]

describe("toImportRows", () => {
  it("selects importable apps and suggests icons", () => {
    const rows = toImportRows(apps)
    expect(rows[0]).toMatchObject({
      key: "1",
      iconSlug: "plex",
      selected: true,
    })
    expect(rows[1]).toMatchObject({
      key: "2",
      iconSlug: "",
      selected: false,
      reason: "Homarr URL is not HTTP(S).",
    })
  })

  it("falls back to an index key when Homarr omits an id", () => {
    const rows = toImportRows([{ ...apps[0], sourceId: "" }])
    expect(rows[0].key).toBe("row-0")
  })
})

describe("clearUnknownIcons", () => {
  it("clears suggested slugs that are not in the catalogue", () => {
    const rows = toImportRows(apps)
    expect(clearUnknownIcons(rows, new Set(["plex"]))[0].iconSlug).toBe("plex")
    expect(clearUnknownIcons(rows, new Set())[0].iconSlug).toBe("")
  })
})

describe("selection helpers", () => {
  it("counts only selected importable rows and deselects imported ones", () => {
    const rows = toImportRows(apps)
    expect(selectedImportRows(rows)).toHaveLength(1)
    const after = applyImported(rows, new Set(["1"]))
    expect(after[0].selected).toBe(false)
  })
})

describe("runImport", () => {
  it("imports each selected row, uses the placeholder for blank icons, and reports failures", async () => {
    const importable: HomarrApp[] = [
      apps[0],
      {
        sourceId: "3",
        name: "No icon",
        description: "",
        url: "https://noicon.home/",
        iconUrl: "",
        importable: true,
        reason: null,
      },
    ]
    const create = vi.fn(async (input: { name: string }) => {
      if (input.name === "Plex") throw new Error("Could not download the icon.")
    })
    const result = await runImport(toImportRows(importable), create)
    expect(result.failures).toEqual([
      { name: "Plex", reason: "Could not download the icon." },
    ])
    expect([...result.importedKeys]).toEqual(["3"])
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "No icon", iconSlug: "placeholder" }),
    )
    expect(create).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "Editor" }),
    )
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/homarr-import.test.ts`
Expected: FAIL — `./homarr-import` cannot be found.

- [ ] **Step 3: Implement the helpers**

Create `src/lib/homarr-import.ts`:

```ts
import { detectIconSlug } from "./homarr-icon"
import type { HomarrApp } from "./homarr"

export type ImportRow = {
  key: string
  name: string
  description: string
  url: string
  iconUrl: string
  iconSlug: string
  importable: boolean
  reason: string | null
  selected: boolean
}

export function toImportRows(apps: HomarrApp[]): ImportRow[] {
  return apps.map((app, index) => ({
    key: app.sourceId || `row-${index}`,
    name: app.name,
    description: app.description,
    url: app.url,
    iconUrl: app.iconUrl,
    iconSlug: detectIconSlug(app.iconUrl) ?? "",
    importable: app.importable,
    reason: app.reason,
    selected: app.importable,
  }))
}

export function clearUnknownIcons(
  rows: ImportRow[],
  known: Set<string>,
): ImportRow[] {
  return rows.map((row) =>
    row.iconSlug && !known.has(row.iconSlug) ? { ...row, iconSlug: "" } : row,
  )
}

export function selectedImportRows(rows: ImportRow[]): ImportRow[] {
  return rows.filter((row) => row.selected && row.importable)
}

export function applyImported(
  rows: ImportRow[],
  importedKeys: Set<string>,
): ImportRow[] {
  return rows.map((row) =>
    importedKeys.has(row.key) ? { ...row, selected: false } : row,
  )
}

export type ImportFailure = { name: string; reason: string }

export async function runImport(
  rows: ImportRow[],
  create: (input: {
    name: string
    description: string
    url: string
    iconSlug: string
  }) => Promise<unknown>,
): Promise<{ importedKeys: Set<string>; failures: ImportFailure[] }> {
  const importedKeys = new Set<string>()
  const failures: ImportFailure[] = []
  for (const row of selectedImportRows(rows)) {
    try {
      await create({
        name: row.name,
        description: row.description,
        url: row.url,
        iconSlug: row.iconSlug || PLACEHOLDER_ICON_SLUG,
      })
      importedKeys.add(row.key)
    } catch (error) {
      failures.push({
        name: row.name,
        reason: error instanceof Error ? error.message : "Import failed.",
      })
    }
  }
  return { importedKeys, failures }
}
```

Add the import at the top of `src/lib/homarr-import.ts`:

```ts
import { PLACEHOLDER_ICON_SLUG } from "./placeholder-icon"
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/homarr-import.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/homarr-import.ts src/lib/homarr-import.test.ts
git commit -m "feat: map Homarr apps into import rows"
```

---

### Task 5: tRPC imports router

**Files:**

- Create: `src/server/routers/imports.ts`
- Modify: `src/server/root.ts`
- Test: `src/server/import-router.test.ts`

**Interfaces:**

- Consumes: `fetchHomarrApps`, `HomarrError`, `homarrConnectionSchema` from `@/lib/homarr`.
- Produces: `importRouter` with `previewHomarr`, mounted as `imports` on `appRouterRoot`.

- [ ] **Step 1: Write the failing test**

Create `src/server/import-router.test.ts`:

```ts
import { describe, expect, it } from "vitest"
import { appRouterRoot } from "./root"

describe("imports router", () => {
  it("rejects anonymous preview calls", async () => {
    const caller = appRouterRoot.createCaller({ session: null })
    await expect(
      caller.imports.previewHomarr({
        baseUrl: "https://homarr.home",
        apiKey: "abc123.token",
      }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" })
  })

  it("maps an invalid Homarr address to a bad request", async () => {
    const caller = appRouterRoot.createCaller({
      session: { user: { id: "user-1" } },
    } as never)
    await expect(
      caller.imports.previewHomarr({ baseUrl: "nope", apiKey: "abc.token" }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("valid HTTP(S)"),
    })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/server/import-router.test.ts`
Expected: FAIL — `imports` is not a property of the caller.

- [ ] **Step 3: Implement the router**

Create `src/server/routers/imports.ts`:

```ts
import { TRPCError } from "@trpc/server"
import {
  fetchHomarrApps,
  HomarrError,
  homarrConnectionSchema,
} from "@/lib/homarr"
import { protectedProcedure, router } from "@/server/trpc"

export const importRouter = router({
  previewHomarr: protectedProcedure
    .input(homarrConnectionSchema)
    .mutation(async ({ input }) => {
      try {
        return await fetchHomarrApps(input)
      } catch (error) {
        if (error instanceof HomarrError)
          throw new TRPCError({ code: "BAD_REQUEST", message: error.message })
        throw error
      }
    }),
})
```

- [ ] **Step 4: Mount the router**

In `src/server/root.ts`:

```ts
import { appRouter } from "./routers/app"
import { boardRouter } from "./routers/board"
import { importRouter } from "./routers/imports"
import { router } from "./trpc"

export const appRouterRoot = router({
  apps: appRouter,
  boards: boardRouter,
  imports: importRouter,
})
export type AppRouter = typeof appRouterRoot
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/server/import-router.test.ts src/server/app-router.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/routers/imports.ts src/server/root.ts src/server/import-router.test.ts
git commit -m "feat: expose a protected Homarr preview procedure"
```

---

### Task 6: Shared icon catalogue and IconPicker refactor

**Files:**

- Create: `src/components/icon-catalogue.tsx`
- Modify: `src/components/icon-picker.tsx`
- Modify: `src/components/modal.tsx`
- Test: `src/components/icon-catalogue.test.tsx`

**Interfaces:**

- Produces from `@/components/icon-catalogue`:
  - `type CatalogueEntry = { base: string; aliases?: string[] }`
  - `type Catalogue = Record<string, CatalogueEntry>`
  - `ICON_METADATA_URL`, `ICON_CDN`
  - `useIconCatalogue(active: boolean): { catalogue: Catalogue | null; error: string; retry: () => void }`
  - `filterIcons(catalogue: Catalogue, query: string): [string, CatalogueEntry][]`
  - `iconPreviewUrl(entry: CatalogueEntry, slug: string): string`
  - `IconCatalogueSearch` component with props `{ catalogue: Catalogue | null; error: string; onRetry: () => void; value: string; onSelect: (slug: string) => void }`. It owns its search query state.
- `ModalContent` gains an optional `wide?: boolean`.

- [ ] **Step 1: Write the failing test**

Create `src/components/icon-catalogue.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import {
  filterIcons,
  IconCatalogueSearch,
  iconPreviewUrl,
  type Catalogue,
} from "./icon-catalogue"

const catalogue: Catalogue = {
  plex: { base: "png", aliases: ["plex-media-server"] },
  jellyfin: { base: "svg" },
}

describe("icon catalogue helpers", () => {
  it("filters by slug and alias", () => {
    expect(filterIcons(catalogue, "plex").map(([slug]) => slug)).toEqual([
      "plex",
    ])
    expect(filterIcons(catalogue, "media").map(([slug]) => slug)).toEqual([
      "plex",
    ])
    expect(filterIcons(catalogue, "nope")).toEqual([])
  })

  it("builds a CDN preview URL", () => {
    expect(iconPreviewUrl({ base: "png" }, "plex")).toBe(
      "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons/png/plex.png",
    )
  })
})

describe("IconCatalogueSearch", () => {
  it("renders matching icons and marks the selected one", () => {
    const html = renderToStaticMarkup(
      <IconCatalogueSearch
        catalogue={catalogue}
        error=""
        onRetry={() => {}}
        value="plex"
        onSelect={() => {}}
      />,
    )
    expect(html).toContain("plex")
    expect(html).toContain('aria-pressed="true"')
  })

  it("offers a retry when the catalogue failed to load", () => {
    const html = renderToStaticMarkup(
      <IconCatalogueSearch
        catalogue={null}
        error="Could not load the icon catalogue."
        onRetry={() => {}}
        value=""
        onSelect={() => {}}
      />,
    )
    expect(html).toContain("Could not load the icon catalogue.")
    expect(html).toContain("Retry")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/icon-catalogue.test.tsx`
Expected: FAIL — `./icon-catalogue` cannot be found.

- [ ] **Step 3: Implement the shared module**

Create `src/components/icon-catalogue.tsx`:

```tsx
"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuRotateCw } from "react-icons/lu"

export type CatalogueEntry = { base: string; aliases?: string[] }
export type Catalogue = Record<string, CatalogueEntry>

export const ICON_METADATA_URL =
  "https://raw.githubusercontent.com/homarr-labs/dashboard-icons/main/metadata.json"
export const ICON_CDN =
  "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons"

export function useIconCatalogue(active: boolean) {
  const [catalogue, setCatalogue] = useState<Catalogue | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!active || catalogue) return
    const controller = new AbortController()
    fetch(ICON_METADATA_URL, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load the icon catalogue.")
        return response.json() as Promise<Catalogue>
      })
      .then(setCatalogue)
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load the icon catalogue.",
          )
      })
    return () => controller.abort()
  }, [active, catalogue])

  return {
    catalogue,
    error,
    retry: () => {
      setCatalogue(null)
      setError("")
    },
  }
}

export function filterIcons(catalogue: Catalogue, query: string) {
  const needle = query.trim().toLowerCase()
  return Object.entries(catalogue)
    .filter(
      ([slug, entry]) =>
        !needle ||
        `${slug} ${(entry.aliases ?? []).join(" ")}`
          .toLowerCase()
          .includes(needle),
    )
    .slice(0, 60)
}

export function iconPreviewUrl(entry: CatalogueEntry, slug: string) {
  return `${ICON_CDN}/${entry.base}/${slug}.${entry.base}`
}

export function IconCatalogueSearch({
  catalogue,
  error,
  onRetry,
  value,
  onSelect,
}: {
  catalogue: Catalogue | null
  error: string
  onRetry: () => void
  value: string
  onSelect: (slug: string) => void
}) {
  const [query, setQuery] = useState("")
  const results = useMemo(
    () => (catalogue ? filterIcons(catalogue, query) : []),
    [catalogue, query],
  )

  return (
    <div className="panel mt-3 p-3">
      <label className="text-xs text-muted" htmlFor="icon-search">
        Search Dashboard Icons
      </label>
      <Input
        id="icon-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or alias"
        className="field mt-2"
      />
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}{" "}
          <Button type="button" className="underline" onClick={onRetry}>
            <LuRotateCw
              aria-hidden
              className="mr-1 inline size-3.5 align-[-2px]"
            />
            Retry
          </Button>
        </p>
      )}
      {!catalogue && !error && (
        <p className="mt-3 text-sm text-muted">Loading icon catalogue…</p>
      )}
      {catalogue && (
        <div
          className="mt-3 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4"
          aria-label="Icon results"
        >
          {results.map(([slug, entry]) => (
            <Button
              type="button"
              key={slug}
              onClick={() => onSelect(slug)}
              aria-pressed={slug === value}
              className={`flex min-w-0 items-center gap-2 border p-2 text-left hover:border-foreground ${slug === value ? "border-accent bg-surface-alt" : "border-line"}`}
            >
              <img
                className="h-8 w-8 shrink-0 object-contain"
                src={iconPreviewUrl(entry, slug)}
                alt=""
                loading="lazy"
              />
              <span className="truncate text-sm">{slug}</span>
            </Button>
          ))}
          {results.length === 0 && (
            <p className="col-span-full py-4 text-center text-sm text-muted">
              No matching icons.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Refactor IconPicker onto the shared module**

Replace the top of `src/components/icon-picker.tsx` so it uses `useIconCatalogue`, `iconPreviewUrl`, and `IconCatalogueSearch`, keeping the same public props and UI:

```tsx
"use client"

import { useState } from "react"
import { Button } from "@base-ui/react/button"
import { LuImage, LuImageOff, LuX } from "react-icons/lu"
import {
  IconCatalogueSearch,
  iconPreviewUrl,
  useIconCatalogue,
} from "@/components/icon-catalogue"

export function IconPicker({
  value,
  onChange,
  cachedValue,
}: {
  value: string
  onChange: (slug: string) => void
  cachedValue?: string
}) {
  const [open, setOpen] = useState(false)
  const { catalogue, error, retry } = useIconCatalogue(open)

  const selectedEntry =
    value && value !== cachedValue ? catalogue?.[value] : undefined
  const selectedPreview = selectedEntry
    ? iconPreviewUrl(selectedEntry, value)
    : value
      ? `/icons/${value}`
      : null

  return (
    <div className="mt-3">
      <div className="flex items-center gap-3 border border-line bg-background p-3">
        {selectedPreview ? (
          <img
            className="h-10 w-10 border border-line bg-surface object-contain p-1"
            src={selectedPreview}
            alt=""
          />
        ) : (
          <span className="grid h-10 w-10 place-items-center border border-line bg-surface text-muted">
            <LuImageOff aria-hidden className="size-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted">Selected icon</p>
          <p className="mt-1 truncate">{value || "Choose an icon"}</p>
        </div>
        <Button
          type="button"
          onClick={() => {
            setOpen(!open)
            retry()
          }}
          className="btn text-xs"
        >
          {open ? (
            <LuX aria-hidden className="size-4" />
          ) : (
            <LuImage aria-hidden className="size-4" />
          )}
          <span>{open ? "Close" : "Choose icon"}</span>
        </Button>
      </div>
      {open && (
        <IconCatalogueSearch
          catalogue={catalogue}
          error={error}
          onRetry={retry}
          value={value}
          onSelect={(slug) => {
            onChange(slug)
            setOpen(false)
          }}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 5: Add a wide variant to ModalContent**

In `src/components/modal.tsx`, add an optional `wide` prop to `ModalContent`:

```ts
export function ModalContent({
  title,
  description,
  wide = false,
  children,
}: {
  title: string
  description?: string
  wide?: boolean
  children: React.ReactNode
}) {
```

```tsx
      <Dialog.Popup
        className={`panel fixed left-1/2 top-1/2 z-50 max-h-[90vh] ${wide ? "w-[min(92vw,44rem)]" : "w-[min(92vw,30rem)]"} -translate-x-1/2 -translate-y-1/2 overflow-y-auto p-5`}
      >
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npx vitest run src/components/icon-catalogue.test.tsx`
Expected: PASS.

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/icon-catalogue.tsx src/components/icon-picker.tsx src/components/modal.tsx src/components/icon-catalogue.test.tsx
git commit -m "refactor: share the Dashboard Icons catalogue across pickers"
```

---

### Task 7: Wizard step components

**Files:**

- Create: `src/components/homarr-import-connect.tsx`
- Create: `src/components/homarr-import-review.tsx`
- Test: `src/components/homarr-import-steps.test.tsx`

**Interfaces:**

- Consumes: `ImportRow` from `@/lib/homarr-import`; `IconCatalogueSearch`, `Catalogue`, `iconPreviewUrl` from `@/components/icon-catalogue`; `PLACEHOLDER_ICON_SLUG` from `@/lib/placeholder-icon`.
- Produces:
  - `HomarrImportConnect({ baseUrl, apiKey, onBaseUrlChange, onApiKeyChange, error, pending, onSubmit })`
  - `HomarrImportReview({ rows, filter, onFilterChange, onToggleRow, onToggleAll, catalogue, catalogueError, onRetryCatalogue, openIconKey, onOpenIcon, onSelectIcon, failures, pending, onBack, onImport })`

- [ ] **Step 1: Write the failing test**

Create `src/components/homarr-import-steps.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { HomarrImportConnect } from "./homarr-import-connect"
import { HomarrImportReview } from "./homarr-import-review"
import type { ImportRow } from "@/lib/homarr-import"

const rows: ImportRow[] = [
  {
    key: "1",
    name: "Plex",
    description: "Movies",
    url: "https://plex.home/",
    iconUrl: "",
    iconSlug: "plex",
    importable: true,
    reason: null,
    selected: true,
  },
  {
    key: "2",
    name: "Editor",
    description: "",
    url: "vscode://file",
    iconUrl: "",
    iconSlug: "",
    importable: false,
    reason: "Homarr URL is not HTTP(S).",
    selected: false,
  },
]

const reviewProps = {
  rows,
  filter: "",
  onFilterChange: () => {},
  onToggleRow: () => {},
  onToggleAll: () => {},
  catalogue: null,
  catalogueError: "",
  onRetryCatalogue: () => {},
  openIconKey: null,
  onOpenIcon: () => {},
  onSelectIcon: () => {},
  failures: [],
  pending: false,
  onBack: () => {},
  onImport: () => {},
}

describe("HomarrImportConnect", () => {
  it("collects the address and API key", () => {
    const html = renderToStaticMarkup(
      <HomarrImportConnect
        baseUrl=""
        apiKey=""
        onBaseUrlChange={() => {}}
        onApiKeyChange={() => {}}
        error=""
        pending={false}
        onSubmit={() => {}}
      />,
    )
    expect(html).toContain('type="password"')
    expect(html).toContain("Connect")
  })
})

describe("HomarrImportReview", () => {
  it("shows importable and excluded rows with counts", () => {
    const html = renderToStaticMarkup(<HomarrImportReview {...reviewProps} />)
    expect(html).toContain("Plex")
    expect(html).toContain("Homarr URL is not HTTP(S).")
    expect(html).toContain("1 of 1 selected")
    expect(html).toContain("Import 1 app")
  })

  it("shows an empty state when Homarr returns no apps", () => {
    const html = renderToStaticMarkup(
      <HomarrImportReview {...reviewProps} rows={[]} />,
    )
    expect(html).toContain("No apps found in Homarr")
  })

  it("lists per-app failures after a partial import", () => {
    const html = renderToStaticMarkup(
      <HomarrImportReview
        {...reviewProps}
        failures={[{ name: "Plex", reason: "Could not download the icon." }]}
      />,
    )
    expect(html).toContain("Could not download the icon.")
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/homarr-import-steps.test.tsx`
Expected: FAIL — the components cannot be found.

- [ ] **Step 3: Implement the connect step**

Create `src/components/homarr-import-connect.tsx`:

```tsx
"use client"

import { Button } from "@base-ui/react/button"
import { Field } from "@base-ui/react/field"
import { Form } from "@base-ui/react/form"
import { Input } from "@base-ui/react/input"
import { LuLoader, LuPlug } from "react-icons/lu"

export function HomarrImportConnect({
  baseUrl,
  apiKey,
  onBaseUrlChange,
  onApiKeyChange,
  error,
  pending,
  onSubmit,
}: {
  baseUrl: string
  apiKey: string
  onBaseUrlChange: (value: string) => void
  onApiKeyChange: (value: string) => void
  error: string
  pending: boolean
  onSubmit: () => void
}) {
  return (
    <Form onFormSubmit={onSubmit}>
      <Field.Root name="baseUrl" className="space-y-2">
        <Field.Label className="text-xs text-muted">Homarr address</Field.Label>
        <Input
          className="field"
          required
          type="url"
          placeholder="https://homarr.example"
          value={baseUrl}
          onChange={(event) => onBaseUrlChange(event.target.value)}
        />
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      <Field.Root name="apiKey" className="mt-4 space-y-2">
        <Field.Label className="text-xs text-muted">API key</Field.Label>
        <Input
          className="field"
          required
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(event) => onApiKeyChange(event.target.value)}
        />
        <p className="text-xs text-muted">
          Create an API key under Authentication in Homarr. It is used once and
          never stored.
        </p>
        <Field.Error className="text-xs text-danger" />
      </Field.Root>
      {error && (
        <p
          role="alert"
          className="mt-3 border border-danger p-3 text-sm text-danger"
        >
          {error}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-2">
        <Button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? (
            <LuLoader aria-hidden className="size-4 animate-spin" />
          ) : (
            <LuPlug aria-hidden className="size-4" />
          )}
          <span>{pending ? "Connecting…" : "Connect"}</span>
        </Button>
      </div>
    </Form>
  )
}
```

- [ ] **Step 4: Implement the review step**

Create `src/components/homarr-import-review.tsx`:

```tsx
"use client"

import { Button } from "@base-ui/react/button"
import { Input } from "@base-ui/react/input"
import { LuArrowLeft, LuCheck, LuImage, LuLoader } from "react-icons/lu"
import {
  type Catalogue,
  IconCatalogueSearch,
  iconPreviewUrl,
} from "@/components/icon-catalogue"
import type { ImportRow } from "@/lib/homarr-import"
import { PLACEHOLDER_ICON_SLUG } from "@/lib/placeholder-icon"

export function HomarrImportReview({
  rows,
  filter,
  onFilterChange,
  onToggleRow,
  onToggleAll,
  catalogue,
  catalogueError,
  onRetryCatalogue,
  openIconKey,
  onOpenIcon,
  onSelectIcon,
  failures,
  pending,
  onBack,
  onImport,
}: {
  rows: ImportRow[]
  filter: string
  onFilterChange: (value: string) => void
  onToggleRow: (key: string, selected: boolean) => void
  onToggleAll: (selected: boolean) => void
  catalogue: Catalogue | null
  catalogueError: string
  onRetryCatalogue: () => void
  openIconKey: string | null
  onOpenIcon: (key: string | null) => void
  onSelectIcon: (key: string, slug: string) => void
  failures: { name: string; reason: string }[]
  pending: boolean
  onBack: () => void
  onImport: () => void
}) {
  const needle = filter.trim().toLowerCase()
  const visible = needle
    ? rows.filter((row) =>
        `${row.name} ${row.description} ${row.url}`
          .toLowerCase()
          .includes(needle),
      )
    : rows
  const importable = rows.filter((row) => row.importable)
  const selected = rows.filter((row) => row.selected && row.importable)

  if (rows.length === 0)
    return (
      <div className="panel border-dashed px-6 py-12 text-center">
        <p className="font-medium">No apps found in Homarr</p>
        <p className="mt-1 text-sm text-muted">
          This instance has no apps to import.
        </p>
        <div className="mt-4 flex justify-center">
          <Button type="button" className="btn" onClick={onBack}>
            <LuArrowLeft aria-hidden className="size-4" />
            Back
          </Button>
        </div>
      </div>
    )

  return (
    <div>
      {rows.length > 0 && (
        <Input
          type="search"
          value={filter}
          onChange={(event) => onFilterChange(event.target.value)}
          placeholder="Filter apps…"
          className="field"
        />
      )}
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={
            importable.length > 0 && selected.length === importable.length
          }
          onChange={(event) => onToggleAll(event.target.checked)}
        />
        Select all importable apps
      </label>
      <p className="mt-1 text-sm text-muted">
        {selected.length} of {importable.length} selected
      </p>
      {failures.length > 0 && (
        <ul
          role="alert"
          className="mt-3 space-y-1 border border-danger p-3 text-sm text-danger"
        >
          {failures.map((failure) => (
            <li key={failure.name}>
              {failure.name}: {failure.reason}
            </li>
          ))}
        </ul>
      )}
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {visible.map((row) => (
          <li key={row.key} className="panel p-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                className="mt-1"
                checked={row.selected}
                disabled={!row.importable}
                onChange={(event) => onToggleRow(row.key, event.target.checked)}
                aria-label={`Import ${row.name}`}
              />
              <img
                src={
                  row.iconSlug && catalogue && catalogue[row.iconSlug]
                    ? iconPreviewUrl(catalogue[row.iconSlug], row.iconSlug)
                    : `/icons/${row.iconSlug || PLACEHOLDER_ICON_SLUG}`
                }
                alt=""
                className="h-10 w-10 shrink-0 border border-line bg-background object-contain p-1"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{row.name}</p>
                {row.description && (
                  <p className="line-clamp-2 text-sm text-muted">
                    {row.description}
                  </p>
                )}
                <p className="truncate text-sm text-muted">{row.url}</p>
                {!row.importable && row.reason && (
                  <p className="mt-1 text-xs text-danger">{row.reason}</p>
                )}
                <p className="mt-1 text-xs text-muted">
                  {row.iconSlug || PLACEHOLDER_ICON_SLUG}
                </p>
              </div>
              <Button
                type="button"
                className="btn text-xs"
                disabled={!row.importable}
                onClick={() =>
                  onOpenIcon(openIconKey === row.key ? null : row.key)
                }
              >
                <LuImage aria-hidden className="size-4" />
                Icon
              </Button>
            </div>
            {openIconKey === row.key && (
              <IconCatalogueSearch
                catalogue={catalogue}
                error={catalogueError}
                onRetry={onRetryCatalogue}
                value={row.iconSlug}
                onSelect={(slug) => onSelectIcon(row.key, slug)}
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" className="btn" onClick={onBack}>
          <LuArrowLeft aria-hidden className="size-4" />
          Back
        </Button>
        <Button
          type="button"
          disabled={pending || selected.length === 0}
          className="btn btn-primary"
          onClick={onImport}
        >
          {pending ? (
            <LuLoader aria-hidden className="size-4 animate-spin" />
          ) : (
            <LuCheck aria-hidden className="size-4" />
          )}
          <span>
            {pending
              ? "Importing…"
              : `Import ${selected.length} app${selected.length === 1 ? "" : "s"}`}
          </span>
        </Button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx vitest run src/components/homarr-import-steps.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/homarr-import-connect.tsx src/components/homarr-import-review.tsx src/components/homarr-import-steps.test.tsx
git commit -m "feat: add Homarr import connect and review steps"
```

---

### Task 8: Wizard container and save flow

**Files:**

- Create: `src/components/homarr-import-dialog.tsx`
- Test: `src/components/homarr-import-dialog.test.tsx`

**Interfaces:**

- Consumes: `trpc` from `@/components/trpc-provider`; `HomarrImportConnect`, `HomarrImportReview`; helpers from `@/lib/homarr-import`; `useIconCatalogue`; `PLACEHOLDER_ICON_SLUG`; `ModalContent`; `Dialog`.
- Produces: `HomarrImportBody({ onClose, onImported })` (the stateful step switch, mounted while the dialog is open) and `HomarrImportDialog({ open, onOpenChange, trigger, onImported })` where `onImported?: (count: number) => void`.

- [ ] **Step 1: Write the failing test**

Create `src/components/homarr-import-dialog.test.tsx`:

```tsx
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

vi.mock("@/components/trpc-provider", () => {
  const useMutation = () => ({
    mutate: () => {},
    mutateAsync: async () => {},
    isPending: false,
    error: null,
  })
  return {
    trpc: {
      useUtils: () => ({ apps: { list: { invalidate: () => {} } } }),
      apps: { create: { useMutation } },
      imports: { previewHomarr: { useMutation } },
    },
  }
})

import { HomarrImportBody } from "./homarr-import-dialog"

describe("HomarrImportBody", () => {
  it("starts on the connection step", () => {
    const html = renderToStaticMarkup(<HomarrImportBody onClose={() => {}} />)
    expect(html).toContain('type="password"')
    expect(html).toContain("Connect")
  })
})
```

The body is tested directly rather than the dialog wrapper because Base UI's `Dialog.Portal` does not render its content during server rendering.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/homarr-import-dialog.test.tsx`
Expected: FAIL — `./homarr-import-dialog` cannot be found.

- [ ] **Step 3: Implement the container**

Create `src/components/homarr-import-dialog.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@base-ui/react/dialog"
import { useIconCatalogue } from "@/components/icon-catalogue"
import { HomarrImportConnect } from "@/components/homarr-import-connect"
import { HomarrImportReview } from "@/components/homarr-import-review"
import { ModalContent } from "@/components/modal"
import { trpc } from "@/components/trpc-provider"
import {
  applyImported,
  clearUnknownIcons,
  runImport,
  toImportRows,
  type ImportFailure,
  type ImportRow,
} from "@/lib/homarr-import"

export function HomarrImportBody({
  onClose,
  onImported,
}: {
  onClose: () => void
  onImported?: (count: number) => void
}) {
  const utils = trpc.useUtils()
  const preview = trpc.imports.previewHomarr.useMutation()
  const create = trpc.apps.create.useMutation()
  const [step, setStep] = useState<"connect" | "review">("connect")
  const [baseUrl, setBaseUrl] = useState("")
  const [apiKey, setApiKey] = useState("")
  const [rows, setRows] = useState<ImportRow[]>([])
  const [filter, setFilter] = useState("")
  const [openIconKey, setOpenIconKey] = useState<string | null>(null)
  const [failures, setFailures] = useState<ImportFailure[]>([])
  const [pending, setPending] = useState(false)
  const catalogueState = useIconCatalogue(step === "review")

  useEffect(() => {
    if (!catalogueState.catalogue) return
    setRows((current) =>
      clearUnknownIcons(
        current,
        new Set(Object.keys(catalogueState.catalogue!)),
      ),
    )
  }, [catalogueState.catalogue])

  function connect() {
    setFailures([])
    preview.mutate(
      { baseUrl, apiKey },
      {
        onSuccess: (apps) => {
          setRows(toImportRows(apps))
          setStep("review")
        },
      },
    )
  }

  async function importSelected() {
    setPending(true)
    setFailures([])
    const result = await runImport(rows, (input) => create.mutateAsync(input))
    void utils.apps.list.invalidate()
    setPending(false)
    if (result.failures.length === 0) {
      onImported?.(result.importedKeys.size)
      onClose()
      return
    }
    setRows((current) => applyImported(current, result.importedKeys))
    setFailures(result.failures)
  }

  if (step === "connect")
    return (
      <HomarrImportConnect
        baseUrl={baseUrl}
        apiKey={apiKey}
        onBaseUrlChange={setBaseUrl}
        onApiKeyChange={setApiKey}
        error={preview.error?.message ?? ""}
        pending={preview.isPending}
        onSubmit={connect}
      />
    )

  return (
    <HomarrImportReview
      rows={rows}
      filter={filter}
      onFilterChange={setFilter}
      onToggleRow={(key, selected) =>
        setRows((current) =>
          current.map((row) => (row.key === key ? { ...row, selected } : row)),
        )
      }
      onToggleAll={(selected) =>
        setRows((current) =>
          current.map((row) => (row.importable ? { ...row, selected } : row)),
        )
      }
      catalogue={catalogueState.catalogue}
      catalogueError={catalogueState.error}
      onRetryCatalogue={catalogueState.retry}
      openIconKey={openIconKey}
      onOpenIcon={setOpenIconKey}
      onSelectIcon={(key, slug) =>
        setRows((current) =>
          current.map((row) =>
            row.key === key ? { ...row, iconSlug: slug } : row,
          ),
        )
      }
      failures={failures}
      pending={pending}
      onBack={() => setStep("connect")}
      onImport={importSelected}
    />
  )
}

export function HomarrImportDialog({
  open,
  onOpenChange,
  trigger,
  onImported,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger?: React.ReactNode
  onImported?: (count: number) => void
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      <ModalContent
        wide
        title="Import from Homarr"
        description="Bring your Homarr apps into the shared library."
      >
        {open && (
          <HomarrImportBody
            onClose={() => onOpenChange(false)}
            onImported={onImported}
          />
        )}
      </ModalContent>
    </Dialog.Root>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/homarr-import-dialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: PASS with no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/homarr-import-dialog.tsx src/components/homarr-import-dialog.test.tsx
git commit -m "feat: add the Homarr import wizard"
```

---

### Task 9: Entry point in the shared app library

**Files:**

- Modify: `src/components/shared-apps.tsx`
- Modify: `src/components/shared-apps.test.tsx`

**Interfaces:**

- Consumes: `HomarrImportDialog` from `@/components/homarr-import-dialog`.
- Produces: an **Import from Homarr** trigger on `/admin/apps` plus a brief imported-count status.

- [ ] **Step 1: Extend the failing test**

In `src/components/shared-apps.test.tsx`, add the import mutation to the `trpc-provider` mock:

```ts
        imports: { previewHomarr: { useMutation } },
```

Add an assertion to the first test:

```ts
expect(html).toContain("Import from Homarr")
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/shared-apps.test.tsx`
Expected: FAIL — the trigger text is missing.

- [ ] **Step 3: Wire the dialog in**

In `src/components/shared-apps.tsx`:

```tsx
import { HomarrImportDialog } from "@/components/homarr-import-dialog"
```

```tsx
const [importing, setImporting] = useState(false)
const [importedCount, setImportedCount] = useState<number | null>(null)
```

```tsx
<div className="flex flex-wrap items-center gap-2">
  <HomarrImportDialog
    open={importing}
    onOpenChange={setImporting}
    onImported={(count) => setImportedCount(count)}
    trigger={
      <Dialog.Trigger className="btn">
        <LuDownload aria-hidden className="size-4" />
        Import from Homarr
      </Dialog.Trigger>
    }
  />
  <AppFormDialog
    open={editing !== undefined}
    app={editing ?? null}
    onOpenChange={(open) => setEditing(open ? null : undefined)}
    trigger={
      <Dialog.Trigger className="btn btn-primary">
        <LuPlus aria-hidden className="size-4" />
        Create app
      </Dialog.Trigger>
    }
  />
</div>
```

Add `LuDownload` to the `react-icons/lu` import. Render the status when set, after the heading row:

```tsx
{
  importedCount !== null && (
    <p role="status" className="mt-4 border border-line p-3 text-sm">
      Imported {importedCount} app{importedCount === 1 ? "" : "s"} from Homarr.
    </p>
  )
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/shared-apps.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/shared-apps.tsx src/components/shared-apps.test.tsx
git commit -m "feat: offer Homarr import from the shared app library"
```

---

### Task 10: Full verification

**Files:** none (verification only).

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: all tests pass.

- [ ] **Step 2: Typecheck, lint, and format**

Run: `npm run typecheck && npm run lint && npm run format:check`
Expected: all clean. Run `npm run format` if formatting is off, then re-run `format:check`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: the production build completes without errors.

- [ ] **Step 4: Confirm spec coverage**

Re-read `spec/homarr-import.md` and confirm each acceptance check maps to a passing test or the manual review below. Fix any gaps inline.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: verify Homarr import end to end"
```

---

## Manual verification (for the reviewer)

1. Start Shelf and sign in; open `/admin/apps`.
2. Click **Import from Homarr**. Enter an unreachable address — expect a clear, retryable error and the entered values retained.
3. Enter a wrong API key against a real Homarr instance — expect "Homarr rejected the API key."
4. Enter a valid address and key — expect the review list. Confirm a known app with a dashboard-icons icon URL shows the matching slug, a custom-scheme app is disabled with a reason, and editing an icon updates its preview.
5. Import a selection including one app without a chosen icon; confirm all apps appear in the library, the placeholder renders on the board, and the imported-count status shows.
6. Force an icon failure (temporarily point one row at a slug absent from the CDN) and confirm the failed app is reported, the others imported, and retrying imports only the failure.
