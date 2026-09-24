# Homarr app import

Import apps from an existing Homarr instance into the shared app library. Only apps are imported: names, descriptions, and URLs map across, while icons are chosen from Dashboard Icons during review. Boards, categories, widgets, and Homarr integrations are out of scope.

## Entry point

- The shared app library at `/admin/apps` offers an **Import from Homarr** action beside **Create app**. It opens a modal wizard for signed-in users.
- The wizard has two steps: **Connect** and **Review**. Entering the flow again always starts a new connection; credentials are not remembered between visits.

## Connection and fetch

- Connect asks for a Homarr base URL and an API key. Both are required. The URL must be a valid HTTP(S) URL with no embedded username or password; a path prefix is preserved so instances served under a subpath work.
- The server requests `<base>/api/apps` with the API key in the `ApiKey` header, an `Accept: application/json` header, and a 15-second timeout. No credentials are stored in the database, written to logs, or echoed back to the client.
- The server validates the response as an array of Homarr app records and rejects responses that are too large or contain too many apps. The call runs through a protected tRPC procedure, so the browser never contacts Homarr directly.
- Failures are reported distinctly and are retryable: an invalid URL, a rejected API key, a missing Homarr API at the address, an unreachable or timed-out host, and an unexpected response body each produce a clear message. A failed fetch leaves the entered URL and key in place.
- Fetched apps are normalized to name, optional description, URL, and icon URL, keyed by Homarr's app id for stable list rendering.

## Review

- Every fetched app appears in a single list. Each importable row has a checkbox that is selected by default, and the list offers a filter by name, description, or URL.
- An app is importable only when its Homarr URL is a valid HTTP(S) URL and its name is nonempty. Apps with a blank, missing, or non-HTTP(S) URL (for example a `vscode://` link) are shown disabled with a short reason and cannot be selected.
- Each row shows the app name, description when present, URL, and its current icon.
- Review communicates how many rows are selected and how many are importable, and the Save action is unavailable when nothing is selected.

## Icon selection

- Homarr stores an icon URL, not a Dashboard Icons slug. When that URL points at a `dashboard-icons` CDN path (`homarr-labs` or `walkxcode`, `png` or `svg`, optional `@ref`), the matching slug is suggested as the row's icon and can be changed.
- A suggested slug is used only when it exists in the current Dashboard Icons catalogue; otherwise the row starts without one.
- The user can change any row's icon through the same Dashboard Icons search used when creating an app. The catalogue is fetched once for the whole wizard and reused across rows.
- A selected row left without an icon is imported with a shared placeholder icon. The placeholder uses a reserved slug backed by a small bundled image that the icon route serves directly; it is always available, never downloaded from the CDN, never written to `/data/icons`, and never removed by icon cleanup.
- Icons are copied into `/data/icons` when the row is saved, exactly as for manually created apps.

## Save

- Save creates selected apps one at a time through the existing shared-app create path. Each success appears in the library immediately.
- A row without a chosen icon saves the placeholder slug instead of failing.
- Failures are per app. Successful apps remain created; failed apps are listed with a reason and the wizard stays open so the user can retry only those. No app is left in a partial or broken state.
- When every selected app is saved, the wizard closes, the app list refreshes, and a brief summary reports how many apps were imported.
- The import is additive. Apps are not matched against existing records, and duplicate names or URLs are allowed, matching the shared library's existing rules.

## Privacy and network

- The API key is sent only to the Hometime server in the request body and used only for the fetch made during that request. It is never persisted, returned to the client, or included in URLs.
- The server fetches only the fixed `/api/apps` path on the supplied origin, rejects embedded credentials, and otherwise follows the existing allowance for private household hosts. Large responses and excessively long app lists are rejected before use.

## Acceptance checks

- Entering a valid Homarr URL and API key lists that instance's apps. An invalid URL, wrong key, unreachable host, or malformed response each show a distinct, retryable error without losing the entered values.
- Apps with a non-HTTP(S) or blank URL are visibly excluded and cannot be imported; all other apps are selected by default.
- A dashboard-icons icon URL pre-selects the matching slug, and changing it in the wizard changes the imported icon.
- Saving a selection creates each app in the shared library with its name, description, URL, and icon; apps without a chosen icon receive the placeholder.
- A per-app failure does not roll back successful imports, is reported with a reason, and can be retried without re-fetching from Homarr.
- The Homarr API key does not appear in the database, in logs, or in any response to the browser.
