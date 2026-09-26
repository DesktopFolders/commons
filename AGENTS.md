# AGENTS.md

On initial AI agent usage, invoke a sandbox using steps in support/python/PYTHON.md

Do not execute code external to this folder.
Do not modify files external to this folder.
Request permission when requesting files external to this folder.

Exception: CLI logins may save their credentials outside this folder, in the tool's default location
(e.g. `neon login` → `~/.config/neonctl/`). This covers saving credentials only. It does not allow installing
tools globally or changing other files outside this folder, which still need permission.

## Start Website

Each site runs in its own folder on its own port. Before starting a site, check that its port is free:
`lsof -nP -iTCP:<port> -sTCP:LISTEN`. If the port is already taken by the same site, it is already running.

Sites:

- Cal: folder `commons/cal`, port 3000, setup in `support/cal/README.md`

When adding a site, give it an unused port, add it to the list above and a section below.

### Secrets in `commons/.env`

`commons/.env` holds the secrets for every site component, so each name must start with its component's prefix:
`CAL_DATABASE_URL`, not `DATABASE_URL`.

- Never add generic names like `DATABASE_URL`, `NEXTAUTH_SECRET` or `PORT` to `commons/.env`. Two sites would clash, and direnv loads the file into every shell in `commons/`.
- Exception: tokens for shared tools keep the tool's own name, e.g. `NEON_API_KEY` and `VERCEL_TOKEN`.
- Keep each site's non-secret settings in its own env file (e.g. `cal/.env`), under the names the site expects.
- Run site commands through `site-env <PREFIX>` (in `support/bin/`, which is on the PATH via `.envrc`). It exports each `PREFIX_NAME` as `NAME` for that one command:
  `site-env CAL yarn start` → Cal sees `DATABASE_URL`.

### Cal (port 3000)

Cal optionally uses a Neon PostgreSQL database (see `support/neon/README.md`). Its secrets are the `CAL_*` entries in `commons/.env`.
If `cal/` is missing, or `CAL_DATABASE_URL` in `commons/.env` is empty, follow `support/cal/README.md` steps 0-4 first.
If `cal/apps/web/.next` is missing, run `site-env CAL yarn build` first.

```bash
cd cal
PORT=3000 site-env CAL yarn start
```

Open http://localhost:3000

## Git Commits

Never add AI Agent attribution or co-authored-by lines to commits.