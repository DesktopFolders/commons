#!/usr/bin/env bash
# Copy Cal's settings and secrets from commons/.env into the Vercel project
# (Production). Values are piped into `vercel env add` through stdin and are
# never printed. Re-run after changing a value, then redeploy.
#
# Usage: support/cal/vercel-env.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="$root/support/bin:$PATH"

PROJECT="commons-cal"
WEBAPP_URL="https://commons-cal.vercel.app"

set -a
# shellcheck disable=SC1091
source "$root/.env"
set +a

for name in CAL_DATABASE_URL CAL_DATABASE_DIRECT_URL CAL_NEXTAUTH_SECRET CAL_CALENDSO_ENCRYPTION_KEY CAL_CRON_API_KEY; do
  if [ -z "${!name:-}" ]; then
    echo "Failed: $name is empty in commons/.env" >&2
    exit 1
  fi
done

# Neon's pooled host is the direct host with -pooler after the endpoint id.
pooled_url="$(printf '%s' "$CAL_DATABASE_URL" | sed -E 's#@(ep-[a-z0-9-]+)\.#@\1-pooler.#; s#-pooler-pooler#-pooler#')"
case "$pooled_url" in
  *-pooler.*) ;;
  *) echo "Failed: could not build the pooled Neon URL from CAL_DATABASE_URL" >&2; exit 1 ;;
esac

# add NAME VALUE [--sensitive|--no-sensitive]
add() {
  local log
  if ! log="$(printf '%s' "$2" | vercel env add "$1" production --project "$PROJECT" --force "${3:---sensitive}" 2>&1)"; then
    echo "Failed: $1" >&2
    echo "$log" >&2
    exit 1
  fi
  echo "  $1"
}

echo "Setting Production environment variables on $PROJECT:"
add DATABASE_URL "$pooled_url"
add DATABASE_DIRECT_URL "$CAL_DATABASE_DIRECT_URL"
add NEXTAUTH_SECRET "$CAL_NEXTAUTH_SECRET"
add CALENDSO_ENCRYPTION_KEY "$CAL_CALENDSO_ENCRYPTION_KEY"
add CRON_API_KEY "$CAL_CRON_API_KEY"
add CRON_SECRET "$CAL_CRON_API_KEY"
add NEXT_PUBLIC_WEBAPP_URL "$WEBAPP_URL" --no-sensitive
add NEXT_PUBLIC_WEBSITE_URL "$WEBAPP_URL" --no-sensitive
add NEXTAUTH_URL "$WEBAPP_URL" --no-sensitive
add CALCOM_TELEMETRY_DISABLED "1" --no-sensitive
# Cal's postinstall runs `husky install`, which needs a .git folder.
add HUSKY "0" --no-sensitive
echo "Done. Vercel does not rebuild on env changes; run support/cal/vercel-deploy.sh"
