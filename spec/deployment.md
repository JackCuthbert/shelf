# Deployment and persistence

## Container contract

- Provide a Dockerfile that builds one runnable Next.js image. Deployment uses a single directory volume mounted at `/data`; it requires no individual file mounts or external database service.
- Store the SQLite database at exactly `/data/app.db` and downloaded app icons under `/data/icons/<slug>.png`. Keep all runtime persistent data under `/data`.
- Configure the public application URL, a persistent authentication secret, and optional `ENABLE_SIGNUP=true` through environment variables. Document a `docker build` and `docker run` example with the directory volume. Self-sign-up defaults to disabled.
- An optional generic OIDC provider is configured with `OIDC_ISSUER`, `OIDC_CLIENT_ID`, and `OIDC_CLIENT_SECRET`; all three must be set. `OIDC_PROVIDER_NAME` optionally changes its display name. Register `${BETTER_AUTH_URL}/api/auth/callback/oidc` as the provider's redirect URI. Keep the client secret private. OIDC account creation follows `ENABLE_SIGNUP`; existing users connect OIDC from account settings after signing in locally.
- On container start, create needed directories, check `/data` is writable, apply committed Prisma migrations, then start the Next.js server. A migration or permission failure stops startup with a clear error.
- Restarts and image upgrades preserve users, sessions, API keys, boards, apps, assignments, selected icons, and app liveness status through the directory volume. A fresh empty volume triggers first-account setup.
- Document a Docker administrator password-reset command. It targets an account by email and prompts for the new password without putting it in process arguments.

Example:

```sh
docker build -t shelf .
docker run -d --name shelf \
  -p 3000:3000 \
  -e BETTER_AUTH_URL=https://shelf.example.com \
  -e BETTER_AUTH_SECRET='replace-with-a-long-random-secret' \
  -v shelf-data:/data \
  shelf
```

Set `ENABLE_SIGNUP=true` to allow later account creation; it is disabled otherwise.

For OIDC, set the issuer URL and client credentials in the container environment. For example, Pocket ID can be used like any other OIDC provider. Register `https://shelf.example.com/api/auth/callback/oidc` as the redirect URI. OIDC provider setup takes effect after restarting the container.

To reset an account password without placing it in process arguments, run:

```sh
docker exec -it shelf npm run admin:reset-password -- person@example.com
```

The command prompts for the new password in the terminal.

## Operational checks

- Start with an empty directory volume, create the first account and an app, restart the container, and confirm the account, app, database, and icon remain available.
- Confirm the image starts with only a directory mount at `/data`, and that the SQLite file is `/data/app.db`.
- Confirm startup fails clearly if `/data` cannot be written or a migration cannot run.
