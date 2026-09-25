# Neon PostgreSQL

Sites in commons use [Neon](https://neon.tech) for hosted PostgreSQL, so no database or Docker runs locally.

Each site gets its own Neon project, so sites never share tables.

| Site | Neon project   | Env file   | Plan               |
| ---- | -------------- | ---------- | ------------------ |
| Cal  | `commons-cal`  | `CAL_*` in `commons/.env` | `plan/PLAN-cal.md` |

## Create a database for a site

1. Sign in at https://console.neon.tech and click **New Project**:
   - Name: `commons-<site>` (e.g. `commons-cal`)
   - Postgres version: the default (17)
   - Region: the one closest to where the site runs (e.g. AWS US East)
2. On the project dashboard, click **Connect**.
3. Turn **Connection pooling off** and copy the connection string. It looks like:
   `postgresql://neondb_owner:PASSWORD@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
4. Paste it into the site's env file (see the site's plan for the variable names).

The connection string contains the database password:

- Keep it only in the site's `.env` file, which is ignored by git.
- Never commit it or paste it into chat.
- If it leaks, reset the password under **Roles** in the Neon console and update the `.env`.

## Optional: Neon CLI and agent tools

After creating a project, Neon offers a "Set up Neon with your coding agent" prompt. It isn't needed to run a site; the connection string in `.env` is enough.
It's useful if you want your coding agent to query or manage the Neon database directly.

These commands install and change things outside `commons/`, which `AGENTS.md` only allows with the user's permission:

```bash
npm i -g neon@latest && neon login   # global CLI; login saves credentials in your home folder
neon skills -y                       # adds Neon skills to your coding agent
neon mcp -y                          # adds the Neon MCP server to your coding agent
neon link --project-id <project-id> --branch production -y   # run in the site's folder, e.g. cal/
```

Find `<project-id>` under **Settings** in the Neon console, or in the prompt Neon shows.

Skip the prompt's `neon config init`, `neon.ts` and `neon deploy` steps. They set up Neon's own backend config, which sites like Cal don't use. Cal creates its tables with its own migrations (`site-env CAL yarn db-deploy`).

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
