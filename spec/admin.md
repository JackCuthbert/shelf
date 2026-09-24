# Management interface

`/admin` is an authenticated view for the signed-in user's boards; the shared app library lives in a separate authenticated view at `/admin/apps`. Both must work on narrow screens and with keyboard navigation. A shared sticky menubar, matching the board view, links the views and includes the signed-in user menu. The menu trigger shows a person icon and the user's display name; it links to Account (`/account`), Boards (`/admin`), and Apps (`/admin/apps`) and offers Sign out. The `/admin`, `/admin/apps`, and `/account` views set the browser title to `Hometime · Boards`, `Hometime · Apps`, and `Hometime · Account`. It must remain usable when the display name is long or the screen is narrow. Creating or editing a board or app opens an accessible modal dialog, and destructive actions ask for confirmation before proceeding. `/admin` is the destination after first-account setup.

## Shared app library

- List app names, descriptions when present, URLs, and saved icons in a single-column list with a filter.
- Create an app with name, optional plain-text description of up to 280 characters, URL, and explicit icon search/selection.
- Edit name, description, URL, or icon. Deleting prompts for confirmation that the app disappears from every board.
- Import apps from an existing Homarr instance through the two-step wizard described in [homarr-import.md](homarr-import.md).
- Every signed-in user sees and can manage the same library.

## My boards

- List only boards owned by the signed-in user for editing, identifying the default board and offering each board's shareable route (`/board/<id>`), which opens in a new tab.
- Create, rename, delete, and choose a default board. The current default board is marked and its set-default control is disabled.
- For each board, add apps from the shared library through a filterable add-app dialog, remove assignments, and reorder them with Move up / Move down controls. Each assigned app row shows its name and domain. These controls work by touch, pointer, and keyboard; drag and drop is not part of v1.
- For each board, create, edit, reorder, and delete categories. Assign apps to one category or leave them uncategorized; Move up / Move down controls reorder categories and apps within each group. The add-app dialog offers an optional category choice. Deleting a category moves its apps to the end of the uncategorized group; see [categories.md](categories.md).
- Creation of a user's first board sets it as default. When a user owns no board, show a clear create-board empty state.
- Changes persist immediately and the affected board view reflects them on its next load. Failed operations show an actionable error without falsely displaying success.

The admin page does not offer editing controls for another user's board.
