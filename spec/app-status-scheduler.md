# App status scheduler

## Scope

Shelf runs in one Docker container, with one SQLite database and a handful of household users. App checks are a serial background loop, not a job-processing subsystem. Keep the existing authorization, app ownership, board layout and reachability behavior.

## Startup

Use the standard Next.js custom-server pattern: prepare Next, listen with its HTTP request handler, then start one scheduler loop. The executable accepts the existing hostname/port options and `PORT`; default to `0.0.0.0:3000`. Service imports do not start the loop.

Use ordinary Node process termination for Ctrl+C, SIGINT and SIGTERM. Do not add a lifecycle module, signal orchestration, socket tracking, explicit database shutdown, or an exported shutdown API. Interrupted checks are retried after restart.

Keep Docker's existing data-directory preparation, permissions, user switch, migrations and administrator reset command. Compile the small entrypoint and its dependencies with the existing TypeScript tooling; package the normal Next output rather than standalone output. Development uses the same entrypoint through tsx.

## Scheduling and data

Keep `status`, `lastCheckedAt` and `lastError`. Add only one nullable `probeRequestedAt` timestamp on App. It represents pending work, including work currently being checked. There are no request revisions, completion revisions, separate running markers, leases or job records.

- All apps are eligible immediately when they have no result, and hourly after their last completed check, whether viewed or assigned to a board.
- Manual refresh records a pending timestamp, bypasses freshness, and takes priority over automatic checks. Repeated requests while pending share the check.
- Check one app at a time. Poll for work once per second when idle. Space hourly check starts by at least five seconds; initial and manual checks bypass that spacing.
- Before an automatic check, record a pending timestamp too. Preserve an existing pending timestamp rather than replacing it.
- Publish status, error and completion time, and clear the pending timestamp, with one conditional update matching the app ID, captured URL and pending timestamp. This small guard prevents an old check from overwriting an edited app or clearing newer work.
- URL edits reset saved status and timestamps, making the new URL eligible. Deletion simply removes the work. Other edits and board assignments do not change the schedule.
- Pending timestamps survive restarts. Automatic eligibility is derived from saved check times; no startup recovery state machine is needed.

Do not hold a database transaction while awaiting the network. Reuse Prisma and the existing database rather than introducing process-owned client registries.

## Probes

Use the same probe for every trigger. Preserve native HTTP(S) GET, no redirect following, acceptance of self-signed HTTPS, and completion when response headers arrive. Any HTTP response means up; network failures mean down. Release the response immediately.

Each attempt has a fifteen-second timeout. Retry transient failures once after a fixed one-second delay, then save one final result and the existing friendly failure reason. A successful check clears the error. No parent cancellation tree, randomized backoff, per-request revision diagnostics or separate shutdown result is needed.

## API and UI

Board reads return saved status immediately and never run probes. The authenticated manual-check procedure records work and returns `{ accepted: true }`. Existing status-query procedures return app ID, saved status, completion time, error and a single `checking` boolean. Checking means pending work or an automatically due result; the UI does not distinguish queued from running.

Poll visible boards every thirty seconds, or every two seconds while checking. Manual controls poll requested apps until checking ends; retain the previous result while waiting. Pause polling while hidden and read again when visible. Show an ordinary retryable API error if requesting or reading status fails. Exact request-completion identities and supersession tracking across tabs or restarts are outside scope.

Keep last-check details, stale-result indication, accessibility and the existing status colors. Use the existing query/cache patterns without a separate client state machine or custom completion event protocol.

## Verification

Keep a small set of behavior tests covering:

- Hourly eligibility, initial/manual priority, serial probes and hourly spacing.
- Saved-state reads that do not probe, request coalescing, restart persistence, and edited/deleted app result guards.
- Reachability, timeout/retry, self-signed HTTPS and response disposal.
- Saved results and simple pending UI, with visible-page polling and ordinary request errors.

Test each behavior at its owning boundary; avoid repeating the same scheduler rules in repository, service and UI suites. Do not add tests for generic signal sequencing, startup cancellation phases, shutdown deadlines or connection tracking.

Run focused checks during implementation. Final build, browser/screenshots and container acceptance are handled separately after the rework is complete.
