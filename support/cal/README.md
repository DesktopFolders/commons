# Cal.diy

Guidance for AI agents setting up and hosting [Cal.diy](https://github.com/calcom/cal.diy) (open-source Cal.com) from `commons/`.

| Setting  | Value                                                  |
| -------- | ------------------------------------------------------ |
| Folder   | `commons/cal` (a separate git clone, ignored by commons) |
| Local    | http://localhost:3000                                  |
| Hosted   | Vercel, Pro or free plan (see "Deploy to Vercel", not yet tested) |
| Database | [Neon](https://neon.tech) PostgreSQL (no Docker)       |
| Auth     | NextAuth 4, built into Cal (`NEXTAUTH_*` settings)     |

## Requirements

- Node and Yarn. Tested with Node 24. Cal ships its own Yarn 4 in `.yarn/releases` and keeps the package cache inside `cal/`.
- A Neon project (see `support/neon/README.md`). Any PostgreSQL host works if it provides an empty database the user can create tables in.

## 0. Create the Neon database (first time only)

Follow `support/neon/README.md` to create a Neon project named `commons-cal`.
In step 2, its **direct** (non-pooled) connection string goes into both `CAL_DATABASE_URL` and `CAL_DATABASE_DIRECT_URL` in `commons/.env`.

## 1. Install (first time only)

Run from `commons/`:

```bash
git clone https://github.com/calcom/cal.diy.git cal
cd cal
yarn install
```

## 2. Configure env files (first time only)

Cal's settings are split across two files. Both are ignored by git.

| File           | Holds                               | Names                        |
| -------------- | ----------------------------------- | ---------------------------- |
| `commons/.env` | Secrets, shared file for all sites  | Prefixed: `CAL_DATABASE_URL` |
| `cal/.env`     | Non-secret Cal settings             | Cal's own: `NEXTAUTH_URL`    |

Cal commands run through `site-env CAL`, which exports each `CAL_NAME` as `NAME` (see "Secrets in `commons/.env`" in `AGENTS.md`).

Run from `cal/`. Each part is only added if it's missing, so this is safe to re-run and never replaces an existing value:

```bash
# cal/.env: Cal's template without the secret lines, telemetry off
test -e .env || grep -vE '^(DATABASE_URL|DATABASE_DIRECT_URL|NEXTAUTH_SECRET|CALENDSO_ENCRYPTION_KEY|CRON_API_KEY)=' .env.example \
  | sed 's/^CALCOM_TELEMETRY_DISABLED=.*/CALCOM_TELEMETRY_DISABLED=1/' > .env

# commons/.env: create from the template (header and optional NEON_API_KEY)
test -e ../.env || cp ../.env.example ../.env

# Cal's database URLs, left empty to fill in from Neon
grep -q '^CAL_DATABASE_URL=' ../.env || cat >> ../.env <<'EOF'

# Cal (support/cal/README.md) - Set the first two. They are the same.
CAL_DATABASE_URL=""
CAL_DATABASE_DIRECT_URL=""
EOF

# Cal's secrets, random values generated once
if ! grep -q '^CAL_NEXTAUTH_SECRET=' ../.env; then
  echo "# Random values generated once during install" >> ../.env
  echo "CAL_NEXTAUTH_SECRET=\"$(openssl rand -base64 32)\"" >> ../.env
fi
grep -q '^CAL_CALENDSO_ENCRYPTION_KEY=' ../.env || echo "CAL_CALENDSO_ENCRYPTION_KEY=\"$(openssl rand -base64 24)\"" >> ../.env
grep -q '^CAL_CRON_API_KEY=' ../.env || echo "CAL_CRON_API_KEY=\"$(openssl rand -hex 16)\"" >> ../.env
grep -q '^CAL_DEMO_PASSWORD=' ../.env || echo "CAL_DEMO_PASSWORD=\"$(openssl rand -base64 18 | tr -d '/+=' | cut -c1-20)\"" >> ../.env
```

The result in `commons/.env`:

| Variable                      | Value                                            |
| ----------------------------- | ------------------------------------------------ |
| `NEON_API_KEY`                | Optional, left empty                             |
| `CAL_DATABASE_URL`            | Paste the Neon direct connection string (step 0) |
| `CAL_DATABASE_DIRECT_URL`     | Same as `CAL_DATABASE_URL`                       |
| `CAL_NEXTAUTH_SECRET`         | Random, generated above                          |
| `CAL_CALENDSO_ENCRYPTION_KEY` | Random, generated above                          |
| `CAL_CRON_API_KEY`            | Random, generated above. Protects Cal's cron endpoints; the value in Cal's `.env.example` is public. |
| `CAL_DEMO_PASSWORD`           | Random, generated above. Password for all demo users (step 3). |

The two database URLs are the only values to fill in by hand.
An agent running this page generates the random secrets itself; nobody needs to look them up or paste them.

`cal/.env` defaults to `NEXT_PUBLIC_WEBAPP_URL` and `NEXTAUTH_URL` of `http://localhost:3000`, which is correct for local use.

Quote values in `commons/.env` (`CAL_X="..."`). `site-env` reads the file as a shell script.
Never commit or paste either file.

Never regenerate a secret on an existing install:

- Changing `CAL_NEXTAUTH_SECRET` signs everyone out.
- Changing `CAL_CALENDSO_ENCRYPTION_KEY` makes stored calendar and app credentials unreadable. Users would have to reconnect them.

Back up `commons/.env` somewhere safe. Losing it has the same effect as regenerating the secrets.
A hosted copy (e.g. on Vercel) must use the same `CALENDSO_ENCRYPTION_KEY` as any database it shares.

## 3. Create the database schema

Run from `cal/`. Repeat after every `git pull`:

```bash
site-env CAL yarn db-deploy
```

### Optional: demo users

`db-seed` loads demo users (all `@example.com`) with event types and bookings.
Cal's seed script gives them known passwords that are published in its repo (e.g. `pro` for `pro@example.com`).
The second command immediately replaces all of them with `CAL_DEMO_PASSWORD` from `commons/.env`. Always run both:

```bash
site-env CAL yarn db-seed
site-env CAL node ../support/cal/set-demo-passwords.js
```

Then sign in as any demo user, e.g. `pro@example.com`, with the `CAL_DEMO_PASSWORD` value.
The seed output still prints the old passwords, but they no longer work.

Seed only a database meant for testing. If a hosted site uses the same Neon database, the demo users appear there too.
A separate Neon branch for local testing avoids that (see `support/neon/README.md`).

## 4. Build

Run from `cal/`. Repeat after `git pull` or any `NEXT_PUBLIC_*` change in `cal/.env`:

```bash
site-env CAL yarn build
```

The build output is in `cal/apps/web/.next`.

## 5. Start

```bash
PORT=3000 site-env CAL yarn start
```

Open http://localhost:3000. A new database redirects to `/auth/setup`, where the first account created becomes the admin.

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

## Deploy to Vercel (not yet tested)

Commands use the local Vercel CLI (`vercel`, see `support/vercel/README.md`), which reads `VERCEL_TOKEN` from `commons/.env`.

### What Cal requires

From `cal/README.md` and `cal/apps/web/vercel.json`:

- **Project root:** `apps/web`, with build command `cd ../.. && yarn build`.
- **Environment variables:** `DATABASE_URL`, `NEXT_PUBLIC_WEBAPP_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `CRON_API_KEY`, `CALENDSO_ENCRYPTION_KEY`.
- **Plan:** Cal's README says the Pro plan is required, because of the free plan's serverless function limit.
  That note may be outdated; only a deploy will tell. `vercel.json` also schedules crons every minute and every 5 minutes.

### Settings for both plans

| Vercel variable           | Value                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`            | Neon **pooled** string: `CAL_DATABASE_URL` with `-pooler` added after the endpoint id (`ep-xxx` → `ep-xxx-pooler`) |
| `DATABASE_DIRECT_URL`     | `CAL_DATABASE_DIRECT_URL` (direct)                                                     |
| `NEXTAUTH_SECRET`         | `CAL_NEXTAUTH_SECRET`                                                                  |
| `CALENDSO_ENCRYPTION_KEY` | `CAL_CALENDSO_ENCRYPTION_KEY` (must match the database's existing data)                |
| `CRON_API_KEY`            | `CAL_CRON_API_KEY`                                                                     |
| `CRON_SECRET`             | `CAL_CRON_API_KEY`. Vercel's cron runner sends it as `Authorization: Bearer ...`       |
| `NEXT_PUBLIC_WEBAPP_URL`  | The Vercel URL or custom domain, e.g. `https://commons-cal.vercel.app`                 |
| `NEXTAUTH_URL`            | Same as `NEXT_PUBLIC_WEBAPP_URL`                                                       |
| `CALCOM_TELEMETRY_DISABLED` | `1`                                                                                  |

- Copy values without printing them: pipe each one into `vercel env add NAME production` (the CloudRoot pattern in `support/vercel/README.md`).
- `NEXT_PUBLIC_*` values are compiled in, so changing the domain needs a redeploy.
- Keep the Vercel function region next to the Neon region (Neon `us-east-1` ↔ Vercel `iad1`).
- Run `site-env CAL yarn db-deploy` locally against Neon before deploying new code. The Vercel build does not migrate.
- Never seed the database a hosted site uses.

### Pro plan

1. Link a project from `cal/`: `vercel link --project commons-cal`, then set its Root Directory to `apps/web`
   (in the project settings, or through the API as CloudRoot's `set-root-directory.js` does).
2. Add the environment variables above.
3. Deploy from `cal/`: `vercel deploy --prod`. Cal's own `vercel.json` crons are used as-is.

### Free (Hobby) plan

Differences from Pro, as far as we know. Check them on the first deploy:

- **Crons:** Hobby cron jobs can run at most once a day, and a deploy fails if `vercel.json` asks for more.
  Deploy with the daily-only config kept in commons, without editing Cal's files:
  `vercel deploy --prod --local-config ../support/cal/vercel.hobby.json`
- **Frequent jobs:** `vercel.hobby.json` drops the jobs Cal runs every minute or every 5 minutes
  (`/api/tasks/cron`, `/api/cron/calendar-subscriptions`, `/api/cron/selected-calendars`, `/api/cron/credentials`).
  If needed, call them from an outside scheduler (e.g. a scheduled GitHub Action) with the header `authorization: <CAL_CRON_API_KEY>`.
  Without them, queued tasks such as some emails and webhooks wait for the next call.
- **Function limit:** if the deploy fails on the number or size of functions, the free plan can't host Cal. Use Pro or another host.
- **Build:** Cal's build is large. If the remote build runs out of memory, build locally with `vercel build --prod`,
  then upload the result with `vercel deploy --prebuilt --prod`.
- **Use:** Hobby is for personal, non-commercial projects.

## About Database

Profile (bio) images are stored in `avatars.data` as text: a base64 `data:` URI, such as `data:image/jpeg;base64,...`.
The original format is kept, except SVG uploads are converted to PNG.

So, even though `users.avatarUrl` ends in `.png` (e.g. `/api/avatar/<objectKey>.png`), a `.jpeg` upload is still stored as JPEG text in `avatars.data`.
Cal adds `.png` to every avatar URL, and `/api/avatar/` ignores the extension. It looks up the row by `objectKey` and returns the stored image.
