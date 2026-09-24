# Accounts and access

## First start

- When no user exists, `/` shows a form to create the first account with email and password.
- The first successful submission atomically claims the instance, signs that user in, and sends them to `/admin`. Concurrent attempts cannot create a second first account through this route.
- The first visitor may claim the instance; no setup token is required.
- The new user creates their first board in `/admin`.

## Stage-one application state

- Until boards are available, a signed-in visitor to `/` is sent to `/admin`.
- The initial `/admin` shell confirms account access and sign-out; board management is added in a later stage.

## Later access

- Signed-out visitors see login at `/`. They can open a board directly at `/board/<nanoid>` without logging in.
- Signed-in users visiting `/` see their default board. If they have no board, they go to the board-creation empty state in `/admin`.
- `/admin` and all edit operations require a valid session. A signed-out visitor trying `/admin` is sent to login and returns to `/admin` after signing in.
- Local login uses email and password. Passwords are hashed and sessions use the auth library's server-validated cookies. No email delivery or email verification is required in v1.
- Self-sign-up after initial setup is controlled by the Docker administrator through `ENABLE_SIGNUP=true`. It is disabled when the variable is absent or false. The first-account flow works regardless of this setting.
- Signed-in users can sign out. New users have no board until they create one in `/admin`.

## Recovery and future identity

- The container provides a documented Docker administrator command to reset a local account password by email. It prompts for the new password without exposing it in shell arguments. There is no in-app email reset in v1.
- Future OIDC/Pocket ID support must preserve existing user and board IDs. Linking an OIDC identity to an existing local account requires the user to sign in to that account first; matching an unverified local email alone must not link accounts. Better Auth supports a generic OIDC provider and explicit account linking. [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth), [account linking](https://better-auth.com/docs/concepts/users-accounts).
