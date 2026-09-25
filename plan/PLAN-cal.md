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
Paste its **direct** (non-pooled) connection string into both `CAL_DATABASE_URL` and `CAL_DATABASE_DIRECT_URL` in `commons/.env` (step 2).

## 1. Install (first time only)

Run from `commons/`:

```bash
git clone https://github.com/calcom/cal.diy.git cal
cd cal
yarn install
```

## 2. Configure env files (first time only)

Cal's settings are split across two files. Both are ignored by git.

| File           | Holds                                              | Names                        |
| -------------- | -------------------------------------------------- | ---------------------------- |
| `commons/.env` | Secrets, shared file for all sites                 | Prefixed: `CAL_DATABASE_URL` |
| `cal/.env`     | Non-secret Cal settings                            | Cal's own: `NEXTAUTH_URL`    |

Cal commands run through `site-env CAL`, which exports each `CAL_NAME` as `NAME` (see "Secrets in `commons/.env`" in `AGENTS.md`).

Run from `cal/`:

```bash
cp .env.example .env
```

In `cal/.env`, delete the `DATABASE_URL`, `DATABASE_DIRECT_URL`, `NEXTAUTH_SECRET` and `CALENDSO_ENCRYPTION_KEY` lines, then set:

| Variable                    | Value                   |
| --------------------------- | ----------------------- |
| `NEXT_PUBLIC_WEBAPP_URL`    | `http://localhost:3000` |
| `NEXTAUTH_URL`              | `http://localhost:3000` |
| `CALCOM_TELEMETRY_DISABLED` | `1`                     |

Add to `commons/.env`:

| Variable                      | Value                                   |
| ----------------------------- | --------------------------------------- |
| `CAL_DATABASE_URL`            | Neon direct connection string (step 0)  |
| `CAL_DATABASE_DIRECT_URL`     | Same as `CAL_DATABASE_URL`              |
| `CAL_NEXTAUTH_SECRET`         | Output of `openssl rand -base64 32`     |
| `CAL_CALENDSO_ENCRYPTION_KEY` | Output of `openssl rand -base64 24`     |

Quote values in `commons/.env` (`CAL_X="..."`). `site-env` reads the file as a shell script.
Never commit or paste either file.

Do not change `CAL_CALENDSO_ENCRYPTION_KEY` after users connect calendars. Stored OAuth tokens become unreadable if it changes.

## 3. Create the database schema

Run from `cal/`. Repeat after every `git pull`:

```bash
site-env CAL yarn db-deploy
```

Optional, loads demo users and event types (test databases only):

```bash
site-env CAL yarn db-seed
```

## 4. Build

Run from `cal/`. Repeat after `git pull` or any `NEXT_PUBLIC_*` change in `cal/.env`:

```bash
site-env CAL yarn build
```

## 5. Start

```bash
PORT=3000 site-env CAL yarn start
```

Open http://localhost:3000 and create the first account.

For development with hot reload, skip the build and run `site-env CAL yarn dev` instead.

## Changing the port

`NEXT_PUBLIC_WEBAPP_URL` is compiled into the build. To move Cal to another port:

1. Update `NEXT_PUBLIC_WEBAPP_URL`, `NEXT_PUBLIC_WEBSITE_URL` and `NEXTAUTH_URL` in `cal/.env`.
2. Run `site-env CAL yarn build` again.
3. Run `PORT=<new port> site-env CAL yarn start`.
4. Update the port in the Start Website list in `AGENTS.md`.

## Update

```bash
cd cal
git pull
yarn install
site-env CAL yarn db-deploy
site-env CAL yarn build
```
