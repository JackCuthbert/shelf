# App liveness status

## Goal

Show whether an app assigned to a viewed board recently responded to a server-side liveness request. Status belongs to the shared app record, so it is consistent across boards.

## Refresh behavior

- Viewing a board requests a status refresh for that board's assigned apps. There is no background worker or periodic polling when a board is not viewed.
- The server resolves the board by its public Nano ID and checks only apps currently assigned to that board. The client never supplies arbitrary URLs.
- Store the latest result on `App`: `status` is `unknown`, `up`, or `down`; `lastCheckedAt` is nullable and records the most recent completed check; `lastError` is nullable and records a short reason when the most recent check failed.
- A successful HTTP response of any status code means `up`; connection errors and timeouts mean `down`. A request timeout is 15 seconds. Status says only that the server received an HTTP response, not that the app is fully functional. A failed check stores a friendly reason such as “Connection refused”, “Host not found”, “Timed out after 15s”, or “TLS certificate error”; a successful check clears it.
- Requests use GET and cancel the response body after headers arrive. Redirects are not followed. HTTPS probes do not validate the server certificate, so self-hosted apps using self-signed certificates still report up.
- Cache the latest completed check per app for 10 minutes, whether its result is `up` or `down`. A board view within the cache window reuses the stored result; otherwise it performs a live check. An app with no completed check is due immediately when its board is viewed. Checks for a board may run concurrently.
- A board refresh returns the current persisted statuses so visible tiles update without reloading the board.
- Editing an app's URL resets its status to `unknown` and clears `lastCheckedAt` and `lastError`, so a board view probes the new endpoint immediately. Edits to the name, description, or icon preserve the cached status.
- Each app in the authenticated shared app library and on its public detail page has a manual check action for signed-in users. It probes only that app, including an app not assigned to a board, and bypasses the 10-minute cache. The server looks up the app's saved URL; the client supplies only its app ID. Manual and automatic checks already in flight for the same app and URL share one probe. If the app's URL changes while a probe is running, discard that probe's result so it cannot replace the reset status for the new URL; a check of the new URL must start a new probe.

## Board display

- Each tile displays a small status marker: green for responding, red for not responding, and grey for unknown. While a board refresh is in progress, the marker keeps the last known state's colour and pulses; a state that is still unknown pulses grey. When the refresh completes, the marker settles on the new state. Its accessible label says “Checking”, “Status unknown”, “Responding”, or “Not responding” as appropriate, and includes the last state while checking. Unknown is used before the first completed check.
- Show the last check time in the accessible label or status detail. Do not change the tile link or app ordering.

## Apps view

- The shared app library shows each app's last recorded state, last check time, and failure reason when present. Opening the library reads persisted status only; it never triggers a probe.
- Each app row has a “Check now” action in its trailing menu, with an accessible name identifying the app. The status dot overlays the top-right corner of the app icon; its accessible status detail includes the last result, check time, and failure reason when present. While a check is in progress, keep the previous result visible, show a checking state, and disable that app's check action. On completion, update only that app's displayed status detail. If the check request itself fails, show an actionable error without presenting it as a probe result or adding a second row to the app card.

## Persistence and security

- `status` is non-null with a default of `unknown`; `lastCheckedAt` and `lastError` are nullable. Existing apps become `unknown` with no recorded reason after migration. Status lives in the existing SQLite database under `/data/app.db`.
- The board refresh operation accepts a board Nano ID, verifies the board exists, and derives the app list and URLs from its current assignments. The manual check operation requires an authenticated user and accepts an existing app ID; it derives the URL from the app record. Existing URL validation continues to allow HTTP(S), including private household hosts.
- The per-app cache prevents repeated public board views from causing unbounded outbound requests. Simultaneous automatic and manual requests in the server process share one in-flight check per app. A completed manual check starts a new 10-minute cache window.

## Acceptance checks

- Existing apps migrate to unknown status without affecting app or board data.
- Viewing a board refreshes only its assigned apps, reusing `up` and `down` results for 10 minutes and probing after expiry.
- Concurrent board viewers and manual checks handled by the server process share one in-flight check for each app.
- Changing an app URL clears its cached status and reason; changing other app fields preserves them.
- A probe started before an app URL edit cannot overwrite the reset status for the new URL.
- HTTP response codes count as responding; network errors and 15-second timeouts count as not responding with a recorded reason.
- The shared app library shows status, last check time, and failure reason without probing on load. “Check now” bypasses the cache for only its app, including an unassigned app, and refreshes that row when complete.
- While a board refresh runs, each marker keeps and pulses its last known state, then settles on the refreshed state when it differs.
- Tile status labels remain available to assistive technology and status updates preserve tile links, descriptions, search, and order.
