# Hometime stage 1 implementation plan

## Goal

Deliver a runnable Next.js App Router and React Server Components app with first-account setup, local login/logout, a protected admin shell, Prisma SQLite persistence at exactly `/data/app.db`, and a single Docker image that migrates before serving.

## Scope

This stage covers the application foundation, account access, and deployment contract only. Shared app CRUD, icon selection/cache, boards, and search remain out of scope. Until boards exist, authenticated visits to `/` redirect to `/admin`. Signup after instance setup requires `ENABLE_SIGNUP=true`. Runtime persistence belongs under `/data`.

## Steps

1. Scaffold a minimal Next.js/TypeScript App Router app; install packages at current npm `latest` tags through mise and commit the lockfile.
2. Add Prisma SQLite auth schema and migrations; configure Better Auth and database-serialized atomic first-user setup, login, logout, and signup policy.
3. Add setup/login pages and a server-protected `/admin` shell; add focused automated tests for account claiming and signup policy.
4. Add one-image Docker build, writable `/data` startup checks, Prisma migrations before serving, and a Docker-admin password-reset command that prompts without a password in process arguments.
5. Document Docker setup, environment variables, volume persistence, and password recovery; run focused checks and Docker build/smoke checks if Docker is available.
6. Review the diff and create release-note-ready Conventional Commits.
