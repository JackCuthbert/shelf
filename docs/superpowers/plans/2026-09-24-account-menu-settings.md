# Account Menu and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give signed-in users a shared header menu and a page to edit their name, email, and password.

**Architecture:** Pass the server-validated session user to one reusable client menu in board and admin headers. Keep the three account forms independent. Use Better Auth for name updates, password verification, and password changes; use one authenticated server endpoint for immediate email changes because Better Auth's built-in change-email route does not accept a current password and has verification-flow constraints.

**Tech Stack:** Next.js App Router, React, Base UI, Better Auth, Prisma, Vitest.

**Spec:** `spec/accounts.md`, `spec/admin.md`, `spec/board-visual-design.md`, `spec/architecture.md`.

## Global Constraints

- Email and password changes require the current password.
- Email changes immediately, without email delivery; reject invalid and already-used addresses.
- Password changes require at least eight characters and revoke other sessions while retaining the current session.
- Anonymous board visitors see Sign in; signed-in users see Account, Admin, and Sign out.
- Keep the menu usable on narrow screens and with keyboard, pointer, and touch input.

## Review Focus

- Wrong current password leaves email and password unchanged.
- An already-used email remains unchanged and returns a useful error.
- The email endpoint changes only the authenticated user.
- Anonymous board rendering never exposes account actions.
- Long display names do not create horizontal scrolling.

---

### Task 1: Shared header menu

**Files:** Create `src/components/user-menu.tsx`; modify `src/components/admin-menubar.tsx`, `src/components/board-search.tsx`, `src/app/admin/page.tsx`, `src/app/admin/apps/page.tsx`, `src/app/board/[nanoid]/page.tsx`; test `src/components/user-menu.test.tsx` and affected header tests.

**Interfaces:** `UserMenu({ user }: { user: { name: string } | null })`; the board and admin pages supply the validated session user or `null`.

- [ ] Write a failing render test for anonymous Sign in and signed-in menu actions. Run `npx vitest run src/components/user-menu.test.tsx` and confirm the expected failure.
- [ ] Build the menu with Base UI Menu, a person icon and truncated display name. Link Account to `/account`, Admin to `/admin`, and call the existing sign-out action. Anonymous users get a Sign in link to `/`.
- [ ] Add server session loading to the public board page and pass the user to `BoardSearch`; pass the existing session user through admin headers. Run affected component tests, `npm run typecheck`, and `npm run lint`.
- [ ] Commit with `feat: add account menu to shared headers`.

### Task 2: Immediate email-change endpoint

**Files:** Create `src/app/api/account/email/route.ts` and `src/app/api/account/email/route.test.ts`; inspect `src/lib/auth.ts` only if the installed Better Auth API requires configuration.

**Interfaces:** `POST /api/account/email` accepts `{ email: string, currentPassword: string }`; success returns `{ email: string }`; failures return a non-2xx response with `{ error: string }`.

- [ ] Write failing tests for unauthenticated requests, wrong password, invalid email, duplicate email, and successful update of the current user only. Run `npx vitest run src/app/api/account/email/route.test.ts` and confirm the expected failures.
- [ ] In the route, get the validated session from request headers, normalize and validate the email, call Better Auth's server-only `verifyPassword`, then update the current Prisma user. Handle the unique-email constraint and return a useful error without exposing another user's data.
- [ ] Run the endpoint test, `npm run typecheck`, and `npm run lint`. Commit with `feat: let users change their email`.

### Task 3: Account page and three forms

**Files:** Create `src/app/account/page.tsx`, `src/components/account-settings.tsx`, and `src/components/account-settings.test.tsx`.

**Interfaces:** The server page redirects anonymous users to `/` and passes the signed-in user's name and email to `AccountSettings`.

- [ ] Write failing tests that the page shows three independent forms and their required fields. Run `npx vitest run src/components/account-settings.test.tsx` and confirm the expected failure.
- [ ] Implement separate name, email, and password forms. Name uses `authClient.updateUser({ name })`; email calls `POST /api/account/email`; password uses `authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: true })`. Show per-form pending, success, and actionable error states. Preserve entries on failure and clear password fields on success.
- [ ] Add the protected page and admin header. Run account tests, `npm run typecheck`, `npm run lint`, and `npm test`.
- [ ] Commit with `feat: add account settings page`.

### Task 4: Final verification

**Files:** No new product files unless a failing check identifies a defect.

- [ ] Run `git diff --check`, `npm run typecheck`, `npm run lint`, and `npm test`; inspect failures and fix only changes caused by this feature.
- [ ] Verify at narrow and wide widths that the menu opens by keyboard, pointer, and touch; anonymous boards show Sign in; account forms save independently; changing the password leaves the current session active and ends another session.
- [ ] Report commits, check results, and unresolved issues.
