# App Status Cache and Manual Check Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cache automatic app probes for 10 minutes, allow a signed-in user to check one app on demand, and show the result in a usable app row.

**Architecture:** Keep one probe service shared by board refreshes and the protected app mutation. Its in-flight key includes the app URL, and persistence rejects a result for a URL that has since changed. The app library calls the per-app mutation and refreshes its list after completion.

**Tech Stack:** Next.js, tRPC, Prisma/SQLite, React, Vitest.

**Spec:** `spec/app-status.md`, `spec/admin.md`.

## Global Constraints

- Automatic results, `up` and `down`, remain fresh for 10 minutes from completion.
- Manual checks bypass the cache and target only the saved URL of the selected app.
- Probes time out after 15 seconds; any HTTP response counts as `up`.
- No background worker; opening the app library does not probe.
- Keep the data and dev server in the main checkout.

## Review Focus

- A manual check of an unassigned app runs once and updates its row.
- A concurrent board and manual check of the same URL share one request.
- A URL edit during a probe cannot restore the old URL's result.
- A request error in the app view preserves the previous status and is reported separately.
- `down` results are cached for the full 10 minutes.

---

### Task 1: Probe service and protected mutation

**Files:** Modify `src/server/app-status-service.ts`, `src/server/app-status-service.test.ts`, `src/server/routers/board.ts`, `src/server/routers/app.ts`, and focused router tests.

**Interfaces:** Produce `apps.recheckStatus({ id })`, a protected tRPC mutation returning the new status. Share one service instance with board refreshes. The repository lookup and conditional update use the saved URL.

- [ ] Add failing tests for 10-minute reuse (including `down`), expiry, 15-second timeout, manual bypass, unassigned app, concurrent checks, and URL-edit race. Run `npm test -- src/server/app-status-service.test.ts` and confirm the expected failures.
- [ ] Add a focused failing router test that calls `apps.recheckStatus({ id: "app-id" })` as an authenticated user and rejects unauthenticated access. Run its test file and confirm failure.
- [ ] Implement the shared service and protected mutation with the smallest API needed; keep the existing board response contract. Run the affected test files until green.
- [ ] Run `npm run typecheck`, then commit with a Conventional Commit message.

### Task 2: App library row and per-app action

**Files:** Modify `src/components/shared-apps.tsx` and `src/components/shared-apps.test.tsx`.

**Interfaces:** Consume `trpc.apps.recheckStatus.useMutation()` with `{ id: string }`; invalidate `apps.list` after completion to display the persisted status, last check time, and reason.

- [ ] Add failing tests for a per-row check button, pending state, row update, request error, and a narrow-screen-compatible row structure. Run `npm test -- src/components/shared-apps.test.tsx` and confirm expected failures.
- [ ] Reflow each row into app details and a wrapping status/actions footer; implement a per-app check action with accessible name and separate request error. Keep other actions intact.
- [ ] Run the affected test file and `npm run typecheck`, then commit with a Conventional Commit message.

### Task 3: Integration verification

**Files:** No expected product-code changes.

- [ ] Run affected service, router, and UI tests, `npm run typecheck`, `npm run lint`, and `npm run build`.
- [ ] Load `/admin/apps` in the local dev server and check the desktop and narrow layouts, pending state, and row refresh.
- [ ] Confirm the working tree is clean and report both commits and any unresolved issues.
