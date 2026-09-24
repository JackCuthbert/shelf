# Boards

## Ownership and management

- Every board has exactly one owning user and an unguessable Nano ID. New IDs are eight characters from the URL-safe Base64 alphabet (`A-Z`, `a-z`, `0-9`, `_`, `-`). Existing longer IDs remain valid. Its permanent public route is `/board/<nanoid>`; changing the board name does not change this URL.
- A user may create, rename, and delete their own boards. Only that user may edit board contents or order. Other users can view a board through its direct URL but cannot edit it.
- The creator's first board automatically becomes their default. They can select another owned board as default later.
- If the default board is deleted, the oldest remaining owned board becomes default. If none remain, the user's default is empty and `/` sends them to the board-creation empty state in `/admin`.
- A board owner can assign an app from the shared library once per board, remove an assignment without deleting the app, and move assigned apps up or down. Order is independent on each board.
- A deleted board URL returns a not-found view. There is no public board listing or search across boards.

## Board view

- `/` resolves the signed-in user's default board. `/board/<nanoid>` resolves that board for any visitor with the link.
- V1 renders app icons and names in one responsive list using the board's persisted top-to-bottom order. The list adapts to narrow screens without horizontal scrolling or a separate mobile layout.
- Selecting an app by pointer, touch, or keyboard opens its URL in a new tab.
- Empty boards show an understandable empty state. Owners can navigate to `/admin` to add apps; visitors see a read-only empty state.
- The search control and keyboard behavior are defined in [search.md](search.md).

No grid coordinates, tiles, resize controls, layout breakpoints, or separate per-device positions exist in v1.
