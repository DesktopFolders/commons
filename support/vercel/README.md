# Vercel CLI

The Vercel CLI is installed here, inside `commons/`, rather than globally.
Run it as `vercel`: `support/bin/vercel` is on the PATH through `.envrc` and wraps the local install.

The wrapper:

- reads `VERCEL_TOKEN` from `commons/.env`, so `vercel login` is never needed
- keeps the CLI's config in `support/vercel/.global/` instead of your home folder
- turns off Vercel CLI telemetry

## Install (first time only)

Run from `commons/support/vercel/`. The npm cache also stays in this folder:

```bash
npm_config_cache="$PWD/.npm-cache" npm ci --no-fund --no-audit
```

`package.json` pins the CLI version. To upgrade it:

```bash
npm_config_cache="$PWD/.npm-cache" npm install --save-exact vercel@latest
```

`node_modules/`, `.npm-cache/` and `.global/` are ignored by git.

## Token

1. Create a token at https://vercel.com/account/tokens.
   - **Scope:** your personal account on the free (Hobby) plan, or the team that owns the project on Pro.
   - **Expiration:** set one. Create a new token when it expires.
2. Paste it into `commons/.env` yourself, as `VERCEL_TOKEN="..."`. Never paste it into chat.
3. Check it: `vercel whoami`

Vercel tokens are scoped to an account or team, not to one project, as far as we know.
So creating the project first does not narrow what the token can reach.
To limit the risk, give the token an expiration date and revoke it when automation is no longer needed.

`VERCEL_TOKEN` is a tool credential like `NEON_API_KEY`, so it has no site prefix.
CloudRoot names the same token `VERCEL_API_TOKEN` in its `.env.local`.

## Patterns reused from CloudRoot

`/Users/loren/GitHub/CloudRoot` deploys its `chat/` app through Vercel's Git integration. Two of its scripts are useful here; its auth is not reused.

- `set-root-directory.js`: sets a project's Root Directory with `PATCH https://api.vercel.com/v9/projects/{name}`,
  sending `Authorization: Bearer <token>` and an optional `?teamId=`.
- `chat/scripts/push-oauth-env-to-vercel.sh`: copies values from a local env file into a linked project.
  It runs `vercel env rm` and then pipes each value into `vercel env add NAME <environment>` through stdin, so values are never printed.
  Vercel does not rebuild when env vars change; redeploy afterwards.

CloudRoot's README also notes that when the Root Directory is a subfolder, Vercel still reads the repo root's `package.json` to detect the package manager and Next.js.
Cal's repo root already has one (`packageManager: yarn@4.12.0`), with the app in `apps/web`.
