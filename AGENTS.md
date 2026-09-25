# AGENTS.md

On initial AI agent usage, invoke a sandbox using steps in support/python/PYTHON.md

Do not execute code external to this folder.
Do not modify files external to this folder.
Request permission when requesting files external to this folder.

## Start Website

Each site runs in its own folder on its own port. Before starting a site, check that its port is free:
`lsof -nP -iTCP:<port> -sTCP:LISTEN`. If the port is already taken by the same site, it is already running.

| Site | Folder        | Port | Setup / details        |
| ---- | ------------- | ---- | ---------------------- |
| Cal  | `commons/cal` | 3000 | `plan/PLAN-cal.md`     |

When adding a site, give it an unused port, add a row above and a section below.

### Cal (port 3000)

Cal uses a Neon PostgreSQL database (see `support/neon/README.md`); its connection string is in `cal/.env`.
If `cal/` is missing, or `cal/.env` still has the `USER:PASSWORD@HOST` placeholder, follow `plan/PLAN-cal.md` steps 0-4 first.
If `cal/.next` is missing, run `yarn build` first.

```bash
cd cal
PORT=3000 yarn start
```

Open http://localhost:3000

## Git Commits

Never add AI Agent attribution or co-authored-by lines to commits.