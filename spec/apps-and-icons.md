# Shared apps and icons

## App records

- Every signed-in user can create, edit, and delete apps in the shared household library.
- An app requires a nonempty name, an HTTP or HTTPS URL, and one explicitly selected icon. URLs may point to private household hosts or IP addresses. Other URL schemes are rejected.
- App names are not unique. The admin list shows the URL alongside the name to distinguish duplicates.
- A saved app can be assigned to one or more boards by each board's owner. Editing an app updates it everywhere it is assigned.
- Deleting an app requires confirmation and removes it from every board.

## Icon selection and persistence

- Opening the icon picker fetches the published Dashboard Icons `metadata.json` in the browser. The picker searches icon slugs and aliases and shows remote CDN previews. No catalogue or unselected preview icon is saved in `/data`. [Published metadata](https://github.com/homarr-labs/dashboard-icons/blob/main/metadata.json).
- A user chooses an icon explicitly; the app name does not auto-select one.
- On app save, the server validates the selected slug and downloads its PNG from the fixed Dashboard Icons CDN pattern into `/data/icons/<slug>.png`. The file is reused when another saved app selects the same slug. The source README documents the CDN URL pattern and PNG format. [Dashboard Icons README](https://github.com/homarr-labs/dashboard-icons/blob/main/README.md).
- Boards serve saved icons from `/data/icons/`, so displaying existing apps does not require the icon source to be available.
- Saving an app with a newly selected icon succeeds only after its download succeeds. On failure, keep the form entries and show a retryable error; do not leave a broken app or overwrite an existing icon choice.
- When an icon is no longer referenced by any saved app, remove its cached file. Existing cached files are not refreshed automatically.

## Acceptance checks

- Selecting an icon and saving an app yields one local PNG used by the board.
- Searching or previewing icons without saving an app leaves `/data/icons/` unchanged.
- Editing a shared app changes it on all assigned boards; deleting it removes all assignments.
