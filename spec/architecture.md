# Architecture and data model

## Stack

- A single Docker image runs a Next.js application using the App Router, React Server Components, and the Node.js runtime.
- SQLite is the only database. Prisma owns the schema, migrations, and application data access.
- tRPC defines typed procedures for app and board reads and writes; the frontend shares their TypeScript types. Server Components may call the tRPC server caller for initial data without an HTTP round trip. Small client components handle forms, the icon picker, and board search.
- Better Auth handles local email/password credentials and sessions through its Next.js integration and Prisma adapter. Its auth routes are separate from tRPC. [Next.js integration](https://better-auth.com/docs/integrations/next), [Prisma adapter](https://better-auth.com/docs/adapters/prisma).
- Account settings use authenticated server-side operations for the current user. Email and password changes verify the existing local password; password changes revoke other sessions while preserving the current session.
- When installing npm modules, use the versions tagged `latest` at installation time and commit the resulting lockfile.

## Core records

- **User:** an account with a nullable default board reference. Authentication tables are managed through Better Auth's Prisma schema generation, with migrations applied by Prisma.
- **App:** one shared household record with a name, optional plain-text description, HTTP(S) URL, and selected Dashboard Icons slug. Descriptions are at most 280 characters; existing apps have an empty description after migration. Two apps may have the same name.
- **Board:** a name, an unguessable Nano ID used in its public URL, and one owning user.
- **Board category:** a board-owned title, optional description, and persisted position among that board's categories. Titles are unique per board without regard to case.
- **Board app:** a unique board/app assignment with a persisted position and optional category on the same board. The same app can appear on multiple boards, at different positions and in different categories.

Keep category positions in one ordered sequence per board and board app positions in one ordered sequence per board. Category membership groups apps; positions order them within each group. Moves, assignment removal, category deletion, and app deletion must leave a deterministic order. There are no coordinates or device-specific layouts. See [categories.md](categories.md).

## Authorization boundary

- Anonymous visitors may read a board only through its direct `/board/<nanoid>` URL. There is no public board directory.
- Every signed-in user may read, create, update, and delete records in the shared app library.
- Only the board owner may create or change that board's categories, assignments, order, name, or default status, or delete the board.
- Authorization is enforced in the server-side tRPC procedures and in protected page loading; hiding controls in the UI is insufficient.
- Deleting a shared app removes its assignments from all boards. Deleting a board removes its assignments.

See [accounts.md](accounts.md), [apps-and-icons.md](apps-and-icons.md), and [boards.md](boards.md) for user-visible behavior.
