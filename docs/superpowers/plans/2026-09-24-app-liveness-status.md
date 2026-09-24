# App Liveness Status Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Show and cache whether apps assigned to a viewed board recently returned an HTTP response.

**Architecture:** Store status and last-check time on the shared Prisma App row. A public board refresh operation resolves apps through the board Nano ID, serves cached results for 60 seconds, and probes stale results server-side; the board client invokes it on mount and renders returned state on each tile. No background worker or periodic polling is added.

**Tech Stack:** Next.js App Router, React, tRPC, Prisma, SQLite, Vitest.

**Spec:** `spec/app-status.md`

## Global Constraints

- SQLite is the only database; Prisma owns schema, migrations, and data access.
- Runtime persistence stays under `/data`, with SQLite at `/data/app.db`.
- Board URLs remain public and app URLs may point to private household hosts.
- Existing board ownership, app links, descriptions, ordering, search, and icon handling remain unchanged.

## Review Focus

- Many simultaneous viewers handled by the server process share one in-flight probe per app.
- Probe timeout and redirects must not leave requests hanging or probe redirect targets.
- A deleted board or removed app must not be probed by a stale refresh request.
- HTTP error status codes still indicate that an app responded.
- Status display must not intercept tile link, keyboard, or description-popover behavior.

---

### Task 1: Persist app status

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260924070000_app_liveness_status/migration.sql`
- Modify: `spec/architecture.md`
- Modify: `spec/deployment.md`

**Interfaces:**

- App fields: `status String @default("unknown")`, `lastCheckedAt DateTime?`.

- [ ] Add `status` and `lastCheckedAt` fields to `App`.
- [ ] Add a migration that gives existing rows status `unknown` and `lastCheckedAt` null.
- [ ] Keep the architecture and deployment specs aligned with persisted status.
- [ ] Run `npm run db:generate` and `npm run typecheck`.

### Task 2: Implement cached board status refresh

**Files:**

- Create: `src/server/app-status-service.ts`
- Create: `src/server/app-status-service.test.ts`
- Modify: `src/server/routers/board.ts`
- Modify: `src/server/root.ts` only if status procedures need a separate router.

**Interfaces:**

- Public board procedure `refreshStatuses({ nanoid })` returns assigned app IDs with current `status` and `lastCheckedAt`.
- Repository rechecks the board/app assignment immediately before starting a stale probe.
- Service probes stale assigned apps with GET, a 3-second timeout, no redirect following, and cancels the body after receiving headers.

- [ ] Test unknown status, fresh-cache reuse, successful HTTP response including 4xx/5xx, network error, timeout, and simultaneous callers.
- [ ] Resolve app URLs only from current assignments on the board identified by Nano ID.
- [ ] Coalesce simultaneous stale checks in a module-level per-app promise map; use persisted `lastCheckedAt` for subsequent cache hits.
- [ ] Persist `up` or `down` and completion time, returning the latest persisted result.
- [ ] Run `npm test -- src/server/app-status-service.test.ts`, then `npm run typecheck`.

### Task 3: Refresh and display status on board tiles

**Files:**

- Modify: `src/app/board/[nanoid]/page.tsx`
- Modify: `src/components/board-search.tsx`
- Modify: `src/components/board-search.test.tsx`
- Modify: `spec/app-status.md`
- Modify: `spec/board-visual-design.md`

**Interfaces:**

- `BoardSearch` receives the board Nano ID and each app's persisted status fields.
- On mount it calls `refreshStatuses` once and applies returned statuses to tiles.

- [ ] Render a compact indicator and accessible state text for unknown/up/down on each tile.
- [ ] Call refresh once on board view and update displayed statuses from the response.
- [ ] Preserve tile activation, search order, description popovers, and touch interactions.
- [ ] Test indicator labels, initial refresh invocation, returned-state updates, and preserved link behavior.
- [ ] Run the focused board component tests, then `npm run typecheck` and `npm run lint`.

### Task 4: Verify deployment migration behavior

**Files:**

- Review: `prisma/migrations/`
- Review: `spec/deployment.md`

- [ ] Run the focused test set and `npm run build` to verify Prisma generation and Next.js integration.
- [ ] Confirm the migration leaves existing app URLs, icons, assignments, and ordering untouched.
