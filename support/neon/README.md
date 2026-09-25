# Neon PostgreSQL

Sites in commons use [Neon](https://neon.tech) for hosted PostgreSQL, so no database or Docker runs locally.

Each site gets its own Neon project, so sites never share tables.

| Site | Neon project   | Env file   | Plan               |
| ---- | -------------- | ---------- | ------------------ |
| Cal  | `commons-cal`  | `cal/.env` | `plan/PLAN-cal.md` |

## Create a database for a site

1. Sign in at https://console.neon.tech and click **New Project**:
   - Name: `commons-<site>` (e.g. `commons-cal`)
   - Postgres version: the default (17)
   - Region: the one closest to where the site runs (e.g. AWS US East)
2. On the project dashboard, click **Connect**.
3. Turn **Connection pooling off** and copy the connection string. It looks like:
   `postgresql://neondb_owner:PASSWORD@ep-xxxx-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
4. Paste it into the site's env file (see the site's plan for the variable names).
5. Add a row to the table above.

The connection string contains the database password:

- Keep it only in the site's `.env` file, which is ignored by git.
- Never commit it or paste it into chat.
- If it leaks, reset the password under **Roles** in the Neon console and update the `.env`.

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
