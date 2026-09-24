# Specification index

The product specification lives in `spec/`. Read a feature specification only when working on that feature. Do not load every specification file by default. Read `spec/architecture.md` when changing a shared boundary, data model, or API, and `spec/deployment.md` when changing persistence or container startup.

| Work area | Specification |
| --- | --- |
| Scope and feature map | `spec/README.md` |
| Next.js, tRPC, Prisma, shared data model | `spec/architecture.md` |
| First-run setup, login, sign-up, access | `spec/accounts.md` |
| Shared apps and icon selection/cache | `spec/apps-and-icons.md` |
| Board ownership, routes, ordering, display | `spec/boards.md` |
| Fuzzy filtering and keyboard behavior | `spec/search.md` |
| App and board management UI | `spec/admin.md` |
| Docker, data volume, migrations, recovery | `spec/deployment.md` |
| Features deferred beyond v1 | `spec/future.md` |

When work spans features, read only the affected specifications and resolve any conflicts against `spec/architecture.md`. Keep the relevant feature specification in sync with intentional behavior changes.

## Implementer communication

When implementing features, agents must keep output token efficient. Communicate only what is necessary for further development or to report a material blocker. Keep progress updates and final handoffs brief and concise.

Implementers started by a primary agent must report back to that primary agent when finished, including the commit, verification results, and any unresolved issues.

## Commit convention

Use Conventional Commits for every commit. Write the summary and any body so generated release notes clearly describe the change's user-visible effect; mark breaking changes with the conventional `!` and `BREAKING CHANGE:` footer.
