# Deployment and persistence

## Container contract

- Provide a Dockerfile that builds one runnable Next.js image. Deployment uses a single directory volume mounted at `/data`; it requires no individual file mounts or external database service.
- Store the SQLite database at exactly `/data/app.db` and downloaded app icons under `/data/icons/<slug>.png`. Keep all runtime persistent data under `/data`.
- Configure the public application URL, a persistent authentication secret, and optional `ENABLE_SIGNUP=true` through environment variables. Document a `docker build` and `docker run` example with the directory volume. Self-sign-up defaults to disabled.
- On container start, create needed directories, check `/data` is writable, apply committed Prisma migrations, then start the Next.js server. A migration or permission failure stops startup with a clear error.
- Restarts and image upgrades preserve users, sessions, boards, apps, assignments, and selected icons through the directory volume. A fresh empty volume triggers first-account setup.
- Document a Docker administrator password-reset command. It targets an account by email and prompts for the new password without putting it in process arguments.

Example:

```sh
docker build -t hometime .
docker run -d --name hometime \
  -p 3000:3000 \
  -e BETTER_AUTH_URL=https://hometime.example.com \
  -e BETTER_AUTH_SECRET='replace-with-a-long-random-secret' \
  -v hometime-data:/data \
  hometime
```

Set `ENABLE_SIGNUP=true` to allow later account creation; it is disabled otherwise. To reset an account password without placing it in process arguments, run:

```sh
docker exec -it hometime npm run admin:reset-password -- person@example.com
```

The command prompts for the new password in the terminal.

## Operational checks

- Start with an empty directory volume, create the first account and an app, restart the container, and confirm the account, app, database, and icon remain available.
- Confirm the image starts with only a directory mount at `/data`, and that the SQLite file is `/data/app.db`.
- Confirm startup fails clearly if `/data` cannot be written or a migration cannot run.
