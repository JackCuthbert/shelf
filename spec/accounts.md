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
- An instance may offer sign-in through one administrator-configured OpenID Connect provider. Users may create accounts through OIDC sign-in only when `ENABLE_SIGNUP=true`; first-account setup remains the local email-and-password flow.
- OIDC identities are linked to an existing local account only when its signed-in user explicitly connects the provider from `/account`. Matching email addresses never link accounts automatically. Linking preserves the local user, email, and board IDs.
- Self-sign-up after initial setup is controlled by the Docker administrator through `ENABLE_SIGNUP=true`. It is disabled when the variable is absent or false. The first-account flow works regardless of this setting.
- Signed-in users can sign out. New users have no board until they create one in `/admin`.

## Account settings

- A signed-in user can open `/account` to edit their own display name, email address, and password. The page uses three separate forms so each change can be saved independently.
- A display-name change takes effect immediately. Changing an email address or password requires the account's current password. A new email must be valid and unused, and takes effect immediately without an email verification message.
- Changing a password requires a new password of at least eight characters and signs out the account's other sessions. The current session stays signed in.
- Failed changes show a clear error and preserve the form entry for correction. Only the signed-in account can be changed.
- When an OIDC provider is configured, the account page shows whether it is connected and lets the signed-in user connect it.

## Recovery and future identity

- The container provides a documented Docker administrator command to reset a local account password by email. It prompts for the new password without exposing it in shell arguments. There is no in-app email reset in v1.
- OIDC/Pocket ID sign-in preserves existing user and board IDs. Linking an identity to an existing local account requires the user to sign in to that account first; matching an email address alone must not link accounts. Better Auth supports a generic OIDC provider and explicit account linking. [Generic OAuth](https://better-auth.com/docs/plugins/generic-oauth), [account linking](https://better-auth.com/docs/concepts/users-accounts).
