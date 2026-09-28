<div align="center">

# Shelf

<img src="screenshot.png">

</div>

Shelf is a small, self-hosted dashboard for one household. It provides a shared library of app links and individually owned boards that are quick to search and easy to edit on any screen — no widgets, YAML, or per-device layouts.

## Features

- A shared app library with a name, optional description, HTTP(S) URL, and an explicitly chosen [Dashboard Icons](https://dashboardicons.com) icon.
- Personal boards with an unguessable public link, owned by one user.
- A responsive tile grid that fills the screen, with app descriptions on hover or focus (and a touch button).
- Board categories to group apps, with manual ordering.
- Fast client-side search across a board.
- App liveness indicators (up, down, not checked).
- Local email/password accounts plus an optional single OIDC provider.
- Import apps from an existing Homarr instance.

## Running with Docker Compose

> **Note:** The container image is not published yet. Until it is, build it yourself from this repository — replace the `image:` line below with `build: .` and run `docker compose up -d --build`.

Create a `compose.yaml`:

```yaml
services:
  shelf:
    image: ghcr.io/jackcuthbert/shelf:latest
    container_name: shelf
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      BETTER_AUTH_URL: https://shelf.example.com
      BETTER_AUTH_SECRET: replace-with-a-long-random-secret
      # ENABLE_SIGNUP: "true"
    volumes:
      - shelf-data:/data

volumes:
  shelf-data:
```

Start it:

```sh
docker compose up -d
```

Open `BETTER_AUTH_URL`; the first visit runs first-account setup. To keep data across upgrades, keep the `/data` volume — it holds the SQLite database (`/data/app.db`) and downloaded icons (`/data/icons`).

## Configuration

| Variable             | Required | Purpose                                                                                                         |
| -------------------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`    | Yes      | Shelf's public URL, e.g. `https://shelf.example.com`. Used for auth and OIDC redirects.                         |
| `BETTER_AUTH_SECRET` | Yes      | Long random signing secret. Generate one with `openssl rand -base64 32` and keep it stable.                     |
| `ENABLE_SIGNUP`      | No       | Set to `true` to allow creating additional accounts. Defaults to disabled; the first account is always allowed. |
| `OIDC_ISSUER`        | No       | Generic OIDC issuer URL.                                                                                        |
| `OIDC_CLIENT_ID`     | No       | OIDC client ID.                                                                                                 |
| `OIDC_CLIENT_SECRET` | No       | OIDC client secret.                                                                                             |
| `OIDC_PROVIDER_NAME` | No       | Display name for the provider. Defaults to `OpenID Connect`.                                                    |
| `SHELF_ICON_DIR`     | No       | Icon cache directory. Defaults to `/data/icons`.                                                                |
| `PORT`               | No       | HTTP port. Defaults to `3000`.                                                                                  |

The OIDC variables must all be set together or startup fails. Register `<BETTER_AUTH_URL>/api/auth/callback/oidc` as the provider's redirect URI, and restart the container after changing these settings. Existing users can connect OIDC from **Account settings** after signing in locally.

`BETTER_AUTH_URL` must match the address users actually visit, so terminate TLS in front of the container and point that hostname at port 3000.

## Agent REST API

Create a named API key in **Account settings** and use it as a bearer token. The generated contract is available at `/api/v1/openapi.json`. For example:

```sh
API_KEY='paste-your-key-here'
BASE='https://shelf.example.com/api/v1'
BOARD=$(curl -fsS -X POST "$BASE/boards" -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' -d '{"name":"Assistant"}')
BOARD_ID=$(printf '%s' "$BOARD" | node -pe 'JSON.parse(require("node:fs").readFileSync(0,"utf8")).id')
curl -fsS "$BASE/icons/search?q=plex" -H "Authorization: Bearer $API_KEY"
APP=$(curl -fsS -X POST "$BASE/apps" -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' -d '{"name":"Plex","description":"","url":"https://plex.home","iconSource":"dashboard","iconSlug":"plex"}')
APP_ID=$(printf '%s' "$APP" | node -pe 'JSON.parse(require("node:fs").readFileSync(0,"utf8")).id')
curl -fsS -X POST "$BASE/boards/$BOARD_ID/apps" -H "Authorization: Bearer $API_KEY" -H 'Content-Type: application/json' -d "{\"appId\":\"$APP_ID\"}"
curl -fsS "$BASE/boards/$BOARD_ID" -H "Authorization: Bearer $API_KEY"
```

The OpenAPI document lists every request and response schema.

## Account maintenance

Reset a password by email; the command prompts for the new password instead of taking it as an argument:

```sh
docker compose exec shelf npm run admin:reset-password -- person@example.com
```
