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

Then set up `commons/.env`. Run from `cal/`.
Each part is only added if it's missing, so this is safe to re-run and never replaces an existing value:

```bash
# Create commons/.env from the template (header and optional NEON_API_KEY)
test -e ../.env || cp ../.env.example ../.env

# Cal's database URLs, left empty to fill in from Neon
grep -q '^CAL_DATABASE_URL=' ../.env || cat >> ../.env <<'EOF'

# Cal (plan/PLAN-cal.md) - Set the first two. They are the same.
CAL_DATABASE_URL=""
CAL_DATABASE_DIRECT_URL=""
EOF

# Cal's secrets, random values generated once
if ! grep -q '^CAL_NEXTAUTH_SECRET=' ../.env; then
  echo "# Random values generated once during install" >> ../.env
  echo "CAL_NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> ../.env
fi
grep -q '^CAL_CALENDSO_ENCRYPTION_KEY=' ../.env || echo "CAL_CALENDSO_ENCRYPTION_KEY=\"$(openssl rand -base64 24)\"" >> ../.env
```

The result in `commons/.env`:

| Variable                      | Value                                          |
| ----------------------------- | ---------------------------------------------- |
| `NEON_API_KEY`                | Optional, left empty                           |
| `CAL_DATABASE_URL`            | Paste the Neon direct connection string (step 0) |
| `CAL_DATABASE_DIRECT_URL`     | Same as `CAL_DATABASE_URL`                     |
| `CAL_NEXTAUTH_SECRET`         | Random, generated above                        |
| `CAL_CALENDSO_ENCRYPTION_KEY` | Random, generated above                        |

Only the two database URLs come from Neon, and they're the only values to fill in by hand.
The two secrets are random values generated once during install. An agent running this plan does this itself; nobody needs to look them up or paste them.

Quote values in `commons/.env` (`CAL_X="..."`). `site-env` reads the file as a shell script.
Never commit or paste either file.

Never regenerate either secret on an existing install:

- Changing `CAL_NEXTAUTH_SECRET` signs everyone out.
- Changing `CAL_CALENDSO_ENCRYPTION_KEY` makes stored calendar and app credentials unreadable. Users would have to reconnect them.

Back up `commons/.env` somewhere safe. Losing it has the same effect as regenerating both.

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
