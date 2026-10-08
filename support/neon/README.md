# Neon PostgreSQL

Sites in commons use [Neon](https://neon.tech) for hosted PostgreSQL, so no database or Docker runs locally.

Each site gets its own Neon project, so sites never share tables.

| Site | Neon project   | Env file   | Plan               |
| ---- | -------------- | ---------- | ------------------ |
| Cal  | `commons-cal` (`aws-us-east-1`) | `CAL_*` in `commons/.env` | `support/cal/README.md` |

## Create a database for a site

Add an organization API key to `commons/.env` as `NEON_API_KEY` (next section), then run `neon-db.mjs`.
It finds or creates the project `commons-<site>` and writes its **direct** connection string to
`<SITE>_DATABASE_URL` and `<SITE>_DATABASE_DIRECT_URL` in `commons/.env`. It never prints the string, and leaves values
that are already set alone.

```bash
node support/neon/neon-db.mjs cal                       # existing commons-cal project
node support/neon/neon-db.mjs cal --create              # create it first if missing (aws-us-east-1)
node support/neon/neon-db.mjs cal --branch dev --create --force   # switch the local .env to a dev branch
node support/neon/neon-db.mjs cal --force               # replace the values already in commons/.env
```

`--branch` points the local `.env` at a branch instead of `production` (see "Branches for testing").
New projects go in **AWS US East 1 (N. Virginia)**, `aws-us-east-1`, where Cal's database is, next to Vercel's
default function region (`iad1`). A project's region can't be changed later; `--region <id>` picks another.

## Organization API key (shared with the org)

Use an **organization** API key in `NEON_API_KEY` rather than a personal one:

| Key | Where in the Neon console | Reaches | Good for |
| --- | ------------------------- | ------- | -------- |
| Organization | Switch to the organization, then **Settings → API keys** | That organization's projects | Sharing with org members; keeps working when someone leaves |
| Personal | **Settings → Personal API keys** (your account) | Everything your account can reach, in every organization | Yourself only |

An organization key belongs to the organization, not to whoever created it. Only org admins can create one.
Neon shows the key once, when it's created.

When creating it you can limit it to one project. A key limited to `commons-cal` can fetch its connection strings
and create branches, but can't create new projects (`--create` without `--branch`).

Sharing it:

- Pass it through a password manager or another private channel. Never paste it into chat, email, an issue or a commit.
- Each person keeps it only in their own `commons/.env`, as `NEON_API_KEY="..."`.
- Anyone holding it can read and delete the databases it reaches. Revoke it (same page) when it leaks or is no longer
  needed, then share a new one.

A personal key works with the script too. If it reaches several organizations, the script lists them and asks for a
`NEON_ORG_ID="..."` line in `commons/.env`.

## Without an API key

The same steps in the Neon console:

1. Sign in at https://console.neon.tech and click **New Project**:
   - Name: `commons-<site>` (e.g. `commons-cal`)
   - Postgres version: the default (17)
   - Region: AWS US East 1 (N. Virginia)
2. On the project dashboard, click **Connect**.
3. Turn **Connection pooling off** and copy the connection string. It looks like:
   `postgresql://neondb_owner:PASSWORD@ep-xxxx-xxxx.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
4. Paste it into the site's env file (see the site's plan for the variable names).

The connection string contains the database password:

- Keep it only in the site's `.env` file, which is ignored by git.
- Never commit it or paste it into chat.
- If it leaks, reset the password under **Roles** in the Neon console and update the `.env`.

## Optional: Neon CLI and agent tools

After creating a project, Neon offers a "Set up Neon with your coding agent" prompt. It isn't needed to run a site; the connection string in `.env` is enough.
It's useful if you want your coding agent to query or manage the Neon database directly.
With `NEON_API_KEY` set, direnv loads it from `commons/.env` and the CLI uses it, so `neon login` isn't needed.

These commands install and change things outside `commons/`, which `AGENTS.md` only allows with the user's permission:

```bash
npm i -g neon@latest && neon login   # global CLI; login saves credentials in your home folder
neon skills -y                       # adds Neon skills to your coding agent
neon mcp -y                          # adds the Neon MCP server to your coding agent
neon link --project-id <project-id> --branch production -y   # run in the site's folder, e.g. cal/
```

Find `<project-id>` under **Settings** in the Neon console, or in the prompt Neon shows.

Skip the prompt's `neon config init`, `neon.ts` and `neon deploy` steps. They set up Neon's own backend config, which sites like Cal don't use. Cal creates its tables with its own migrations (`site-env CAL yarn db-deploy`).

## Branches for testing

A Neon project can have several branches, each a separate copy of the database with its own connection string.
Keep `production` for the hosted site, and create a branch (e.g. `dev`) in the Neon console under **Branches** for local testing and demo data.
Point the local site's `.env` at the branch's connection string.

## Pooled or direct connection

Neon gives two connection strings. The pooled one has `-pooler` in its hostname.

| Use          | When                                                                       |
| ------------ | -------------------------------------------------------------------------- |
| **Direct**   | Long-running local servers (`yarn start`, `yarn dev`) and all migrations   |
| **Pooled**   | Serverless deployments (Vercel, AWS Lambda) that open many short connections |

Locally, use the direct string everywhere. Prisma apps also need the direct string for migrations, which is what `DATABASE_DIRECT_URL` is for.

## Troubleshooting

| Symptom                                   | Fix                                                                 |
| ----------------------------------------- | ------------------------------------------------------------------- |
| SCRAM or channel-binding error on connect | Remove `&channel_binding=require` from the URL                      |
| First request after idle is slow          | Normal. Free-tier databases pause when idle and take ~1-2s to wake |
| `P1001: Can't reach database server`      | Check the hostname, and that the Neon project isn't deleted or suspended |
| `password authentication failed`          | Recopy the string from **Connect**, or reset the role password     |
