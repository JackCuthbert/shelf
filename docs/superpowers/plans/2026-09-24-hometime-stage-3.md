# Hometime Stage 3 Implementation Plan

**Goal:** Add owned boards, per-board app assignments and manual ordering, public board views, and signed-in default-board routing.

**Architecture:** Extend Prisma with an owner-linked Board, per-board ordered BoardApp assignments, and a nullable User default board. Use owner-checked tRPC mutations and public Nano ID reads. Render board pages server-side; manage boards and assignments from authenticated admin UI.

**Tasks:**
1. Add board/default/assignment schema, migration, and focused service tests for ownership, defaults, and reorder behavior.
2. Add validated board procedures for CRUD, default selection, assignment add/remove/move, plus public board lookup.
3. Add board management UI and integrate it with the existing shared app admin area.
4. Route signed-in `/` to the default board; add `/board/[id]` read-only-capable responsive list and empty states.
5. Run focused tests, typecheck and relevant checks; inspect diff and commit as `feat: add owned boards and public board views`.
