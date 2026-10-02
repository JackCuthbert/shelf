# App liveness status

## Saved status and scheduling

Status belongs to the shared `App` record and is consistent across boards. `status` is `unknown`, `up`, or `down`; `lastCheckedAt` records the last completed check and `lastError` stores its short failure reason. Any HTTP response means `up`; connection failures and timeouts mean `down`. Requests use GET, do not follow redirects, accept self-signed HTTPS, and finish when response headers arrive. A successful check clears the error.

The in-process scheduler checks apps one at a time. New apps are due immediately; all apps become due one hour after their last completed check, regardless of assignment or board activity. Manual requests take priority. A nullable `probeRequestedAt` timestamp records pending work, including work currently being checked. Pending work survives restarts. Board and library reads never run checks or write scheduling state.

## APIs

- `boards.refreshStatuses({ nanoid })` is a public query. It verifies the board exists and returns saved snapshots for its assigned apps in display array shape. It never probes or changes scheduling state.
- `apps.statuses({ ids })` is a public, read-only query accepting zero to one hundred eight-character Nano IDs. Duplicate IDs are read once, missing apps are omitted, and the caller cannot provide URLs.
- `apps.recheckStatus({ id })` requires authentication and an existing app. It records/joins manual intent and returns `{ accepted: true }` before the check completes. The client supplies only the app ID; the server uses the saved URL.
- Snapshots include `id`, `status`, `lastCheckedAt` in epoch milliseconds or null, `lastError`, one `checking` boolean, and the effective `checkIntervalSeconds`. Checking means pending work or an automatically due result.

URL edits reset saved status and invalidate work for the old URL. Other app edits and assignment changes preserve status. Only the current valid probe result can be published.

## Board display

Board pages supply saved snapshots initially. While visible, the client polls every thirty seconds, or every two seconds while an app is checking. Polling pauses when hidden and reads immediately on resume. A read failure retains saved results and offers retry; it never changes reachability. Each tile keeps its previous green/red/grey result while checking and pulses. Status detail includes the last check time in the browser's local timezone, failure reason, and a stale label at one hour. Links, descriptions, search, and ordering are unchanged.

## Apps and detail views

The shared app library and public detail page render saved status without accepting a check on open. Check times in the detail page and status hover text use the browser's local timezone. Signed-in users can request a manual check for an app, including an app not assigned to a board. Controls remain busy while checking. Clients poll requested IDs every two seconds while visible; hidden views retain intent and read immediately when visible again. A failed read retains reachability and offers retry. Completion updates only that app in the library cache; the detail page refreshes saved status after completion.

## Persistence and security

Status and scheduling metadata live in the existing SQLite database under `/data/app.db`. The board status query verifies the board and derives apps from its current assignments. Existing authorization and URL validation remain in force, including private household HTTP(S) hosts.

## Acceptance checks

- Board status queries return promptly with saved snapshots, preserve array shape, verify existence, and perform no probes or scheduling writes, including with concurrent readers.
- Automatic work follows the one-hour freshness rule for assigned and unassigned apps; manual acceptance returns before completion.
- Status APIs serialize timestamps as epoch milliseconds, deduplicate reads, omit missing apps, accept an empty list, enforce the one-hundred ID bound, and reject invalid IDs and URLs.
- Manual clients remain busy while pending across read errors and hidden-page pauses, then resolve by completion or deletion.
- Visible polling preserves prior reachability, shows stale/error details, retains saved results after read errors, and offers retry without changing links or order.
