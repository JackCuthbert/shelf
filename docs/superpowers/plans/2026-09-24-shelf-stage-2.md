# Shelf Stage 2 Implementation Plan

**Goal:** Add a shared household app library with authenticated CRUD, explicit Dashboard Icons selection, and durable local PNG caching.

**Architecture:** Prisma owns App records; authenticated tRPC procedures validate input and coordinate record changes with an icon-cache service. The admin Server Component loads initial apps, while a typed tRPC client powers create/edit/delete and browser-only catalogue search/previews. Local icons are served from `/icons/<slug>.png` backed by `/data/icons`.

**Tech Stack:** Next.js App Router, Prisma/SQLite, tRPC, Zod, React, Vitest.

**Spec:** `spec/architecture.md`, `spec/apps-and-icons.md`, `spec/admin.md`, `spec/deployment.md`.

## Tasks

1. Add App model and migration; generate Prisma client.
2. Add app input validation and icon cache service. Tests cover URL/slug rejection, cache reuse, failed downloads, and removal after last reference.
3. Add authenticated tRPC context/router and HTTP route; test anonymous rejection and CRUD authorization through focused service/procedure tests.
4. Add typed React tRPC provider and admin app list/form, browser metadata search, remote previews, explicit selection, confirmation, and retryable errors.
5. Add local icon serving route and update app/deployment specifications where needed.
6. Run focused tests, full test suite, typecheck, Prisma migration/runtime checks, inspect diff, and commit with a release-note-ready Conventional Commit.
