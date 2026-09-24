# App liveness status

## Goal

Show whether an app assigned to a viewed board recently responded to a server-side liveness request. Status belongs to the shared app record, so it is consistent across boards.

## Refresh behavior

- Viewing a board requests a status refresh for that board's assigned apps. There is no background worker or periodic polling when a board is not viewed.
- The server resolves the board by its public Nano ID and checks only apps currently assigned to that board. The client never supplies arbitrary URLs.
- Store the latest result on `App`: `status` is `unknown`, `up`, or `down`; `lastCheckedAt` is nullable and records the most recent completed check.
- A successful HTTP response of any status code means `up`; connection errors and timeouts mean `down`. A request timeout is three seconds. Status says only that the server received an HTTP response, not that the app is fully functional.
- Requests use GET and cancel the response body after headers arrive. Redirects are not followed.
- Cache the latest completed check per app for 60 seconds. A board view within the cache window reuses the stored result; otherwise it performs a live check. Checks for a board may run concurrently.
- A board refresh returns the current persisted statuses so visible tiles update without reloading the board.
- Editing an app's URL resets its status to `unknown` and clears `lastCheckedAt`, so a board view probes the new endpoint immediately. Edits to the name, description, or icon preserve the cached status.

## Board display

- Each tile displays a small status marker: green for responding, red for not responding, and grey for unknown. While a board refresh is in progress, the marker pulses grey. Its accessible label says “Checking”, “Status unknown”, “Responding”, or “Not responding” as appropriate. Unknown is used before the first completed check.
- Show the last check time in the accessible label or status detail. Do not change the tile link or app ordering.

## Persistence and security

- `status` is non-null with a default of `unknown`; `lastCheckedAt` is nullable. Existing apps become `unknown` after migration. Status lives in the existing SQLite database under `/data/app.db`.
- The refresh operation accepts a board Nano ID, verifies the board exists, and derives the app list and URLs from its current assignments. Existing URL validation continues to allow HTTP(S), including private household hosts.
- The per-app cache prevents repeated public board views from causing unbounded outbound requests. Simultaneous requests in the server process share one in-flight check per app.

## Acceptance checks

- Existing apps migrate to unknown status without affecting app or board data.
- Viewing a board refreshes only its assigned apps, reusing cached results for 60 seconds.
- Concurrent board viewers handled by the server process share one in-flight check for each app.
- Changing an app URL clears its cached status; changing other app fields preserves it.
- HTTP response codes count as responding; network errors and timeouts count as not responding.
- Tile status labels remain available to assistive technology and status updates preserve tile links, descriptions, search, and order.
