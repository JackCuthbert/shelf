# Management interface

`/admin` is an authenticated page with a shared app library area and an area for the signed-in user's boards. It must work on narrow screens and with keyboard navigation. It is the destination after first-account setup.

## Shared app library

- List app names, URLs, and saved icons.
- Create an app with name, URL, and explicit icon search/selection.
- Edit name, URL, or icon. Deleting prompts for confirmation that the app disappears from every board.
- Every signed-in user sees and can manage the same library.

## My boards

- List only boards owned by the signed-in user for editing, identifying the default board and offering each board's shareable direct URL.
- Create, rename, delete, and choose a default board.
- For each board, add apps from the shared library, remove assignments, and reorder them with Move up / Move down controls. These controls work by touch, pointer, and keyboard; drag and drop is not part of v1.
- Creation of a user's first board sets it as default. When a user owns no board, show a clear create-board empty state.
- Changes persist immediately and the affected board view reflects them on its next load. Failed operations show an actionable error without falsely displaying success.

The admin page does not offer editing controls for another user's board.
