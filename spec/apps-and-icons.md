# Shared apps and icons

## App records

- Every signed-in user can create, edit, and delete apps in the shared household library.
- App creation is available from signed-in navigation. Outside a board, the creator may optionally select an owned board and one of its categories (or leave it uncategorized). On an owned board view, creation defaults to adding the new shared app to that board; the creator can turn this off, and managed board views also allow category selection. On an owned public board view, the action offers Create app and Add existing app forms in one tabbed modal. Both place a checkbox labelled with the board name as the final option before Save. The Create app tab has no category selector. Category selectors are labelled “Add to category (optional)”. Assignment to the current board is available only to its owner. If creation succeeds but assignment fails, report that the shared app was created and the assignment failed; retrying must only retry assignment for the saved app and must not create a duplicate.
- An app requires a nonempty name, an HTTP or HTTPS URL, and one explicitly selected icon. URLs may point to private household hosts or IP addresses. Other URL schemes are rejected.
- An app has exactly one icon source: a Dashboard Icons slug or a downloaded custom image. The two are mutually exclusive and the form presents them as separate choices.
- An app may have a plain-text description of up to 280 characters. Empty descriptions are allowed. Existing apps have an empty description after migration.
- App names are not unique. The admin list shows the URL alongside the name to distinguish duplicates.
- A saved app can be assigned to one or more boards by each board's owner. Editing an app updates it everywhere it is assigned.
- Deleting an app requires confirmation and removes it from every board.

## Icon selection and persistence

- Opening the icon picker fetches the published Dashboard Icons `metadata.json` in the browser. The picker searches icon slugs and aliases and shows remote CDN previews. No catalogue or unselected preview icon is saved in `/data`. [Published metadata](https://github.com/homarr-labs/dashboard-icons/blob/main/metadata.json).
- The Dashboard Icons results list opens when no icon is selected, shows about three rows at a time within a bordered scrolling grid, and narrows as the user filters. Selecting an icon collapses the grid; the selected row offers Change icon to reopen it.
- In app creation, the selected-icon row and search share a darkened background and a single outer border while the grid is open.
- A user chooses an icon explicitly; the app name does not auto-select one. The Homarr import is the one exception: it may pre-select a slug detected from the source icon URL, and assigns the reserved placeholder icon when a row is saved without a chosen icon. See [homarr-import.md](homarr-import.md).
- The placeholder icon is bundled with the application, never downloaded from the CDN, and never removed by icon cleanup.
- On app save, the server validates the selected slug and downloads its PNG from the fixed Dashboard Icons CDN pattern into `/data/icons/<slug>.png`. The file is reused when another saved app selects the same slug. The source README documents the CDN URL pattern and PNG format. [Dashboard Icons README](https://github.com/homarr-labs/dashboard-icons/blob/main/README.md).
- Boards serve saved icons from `/data/icons/`, so displaying existing apps does not require the icon source to be available.
- Saving an app with a newly selected icon succeeds only after its download succeeds. On failure, keep the form entries and show a retryable error; do not leave a broken app or overwrite an existing icon choice.
- When an icon is no longer referenced by any saved app, remove its cached file. Existing cached files are not refreshed automatically.

## Custom image URLs

- As an alternative to a Dashboard Icons slug, the app form lets a user paste a URL to an image and save it as the app's icon.
- On save, the server downloads the image and caches it in `/data/icons/`. Only PNG images are accepted, up to 5 MB, verified by content type and PNG signature. Other formats and oversized images are rejected with a retryable error that keeps the form entries.
- The cached file is named by the SHA-256 hash of its bytes. Identical images received from different URLs are stored once and shared. The hash is stored on the app record and is the file the board loads.
- The source URL is stored on the app record so the edit form can show it. An existing custom image is not re-downloaded while its URL is unchanged; changing the URL downloads and caches the new image.
- The source URL may point to private household hosts or IP addresses, consistent with app URLs, and is subject to the same trusted, authenticated server fetch as other downloads.
- When a custom image is no longer referenced by any saved app, its cached file is removed.

## Acceptance checks

- Selecting an icon and saving an app yields one local PNG used by the board.
- Pasting an image URL and saving an app stores one local PNG named by the image's SHA-256 hash, and the board serves that hash from `/data/icons/`.
- Two apps that use the same custom image URL share one cached file.
- Editing an unchanged custom image URL does not re-download the image; changing the URL downloads and caches the new image.
- A non-PNG or oversized custom image is rejected and the form keeps its entries.
- Searching or previewing icons without saving an app leaves `/data/icons/` unchanged.
- Editing a shared app changes it on all assigned boards; deleting it removes all assignments.
- A saved description appears in the shared app library and in the app edit form. Board tiles expose it through an immediately opened popover on hover or keyboard focus. A separate info button opens it on touch screens without changing the tile's app link. Apps without descriptions have no popover or info button.
