# Plan Cal

Run [Cal.diy](https://github.com/calcom/cal.diy) (open-source Cal.com) locally in `commons/cal`.

| Setting  | Value                                  |
| -------- | -------------------------------------- |
| Folder   | `commons/cal` (ignored by commons git) |
| Port     | `3000`                                 |
| Database | [Neon](https://neon.tech) PostgreSQL (no Docker) |

## Requirements

- Node 20+ and Yarn (Cal ships its own Yarn 4 in `.yarn/releases`, with the package cache kept inside `cal/`)
- A Neon project (see below). Any other PostgreSQL host also works if it provides an empty database that the user can create tables in.

## 0. Create the Neon database (first time only)

Follow `support/neon/README.md` to create a Neon project named `commons-cal`.
Paste its **direct** (non-pooled) connection string into both `DATABASE_URL` and `DATABASE_DIRECT_URL` in `cal/.env` (step 2).

## 1. Install (first time only)

Run from `commons/`:

```bash
git clone https://github.com/calcom/cal.diy.git cal
cd cal
yarn install
```

## 2. Configure `cal/.env` (first time only)

```bash
cp .env.example .env
```

Then set these values in `cal/.env`:

| Variable                  | Value                                                                  |
| ------------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon direct connection string (step 0)                                 |
| `DATABASE_DIRECT_URL`     | Same as `DATABASE_URL`                                                 |
| `NEXTAUTH_SECRET`         | Output of `openssl rand -base64 32`                                    |
| `CALENDSO_ENCRYPTION_KEY` | Output of `openssl rand -base64 24`                                    |
| `NEXT_PUBLIC_WEBAPP_URL`  | `http://localhost:3000`                                                |
| `NEXTAUTH_URL`            | `http://localhost:3000`                                                |
| `CALCOM_TELEMETRY_DISABLED` | `1`                                                                  |

`cal/.env` holds secrets. It is ignored by git, so never commit or paste it.

Do not change `CALENDSO_ENCRYPTION_KEY` after users connect calendars. Stored OAuth tokens become unreadable if it changes.

## 3. Create the database schema

Run from `cal/`. Repeat after every `git pull`:

```bash
yarn db-deploy
```

Optional, loads demo users and event types (test databases only):

```bash
yarn db-seed
```

## 4. Build

Run from `cal/`. Repeat after `git pull` or any `NEXT_PUBLIC_*` change in `.env`:

```bash
yarn build
```

## 5. Start

```bash
PORT=3000 yarn start
```

Open http://localhost:3000 and create the first account.

For development with hot reload, skip the build and run `yarn dev` instead.

## Changing the port

`NEXT_PUBLIC_WEBAPP_URL` is compiled into the build. To move Cal to another port:

1. Update `NEXT_PUBLIC_WEBAPP_URL`, `NEXT_PUBLIC_WEBSITE_URL` and `NEXTAUTH_URL` in `cal/.env`.
2. Run `yarn build` again.
3. Run `PORT=<new port> yarn start`.
4. Update the port in the Start Website table in `AGENTS.md`.

## Update

```bash
cd cal
git pull
yarn install
yarn db-deploy
yarn build
```
