#!/usr/bin/env bash
# Deploy Cal to the Vercel project from a clean export of cal/'s committed
# files, so local .env files and build output are never uploaded.
#
# Usage: support/cal/vercel-deploy.sh [--pro]
#   default: free (Hobby) plan. The export's apps/web/vercel.json is replaced
#            with support/cal/vercel.hobby.json (daily crons only).
#   --pro:   Pro plan. Cal's own apps/web/vercel.json is kept, minus its empty
#            "functions": {}, which Vercel's build now rejects.
# Vercel's remote build reads apps/web/vercel.json from the upload, so the
# file is changed in the export only; cal/ itself is never modified.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
export PATH="$root/support/bin:$PATH"

PROJECT="commons-cal"
out="$root/.deploy/cal"

plan="hobby"
if [ "${1:-}" = "--pro" ]; then
  plan="pro"
fi

echo "Exporting cal/ at $(git -C "$root/cal" rev-parse --short HEAD) to .deploy/cal"
rm -rf "$out"
mkdir -p "$out/.vercel"
git -C "$root/cal" archive HEAD | tar -x -C "$out"

if [ "$plan" = "hobby" ]; then
  cp "$root/support/cal/vercel.hobby.json" "$out/apps/web/vercel.json"
else
  node -e '
    const f = process.argv[1], j = require(f);
    if (j.functions && Object.keys(j.functions).length === 0) delete j.functions;
    require("fs").writeFileSync(f, JSON.stringify(j, null, 2) + "\n");' "$out/apps/web/vercel.json"
fi
echo "Using the $plan plan vercel.json"

# Link the export to the project without `vercel link` (which may pull env files).
vercel api "/v9/projects/$PROJECT" --raw 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
    const p = JSON.parse(s);
    if (!p.id) { console.error("Failed: project not found: " + JSON.stringify(p.error || p)); process.exit(1); }
    process.stdout.write(JSON.stringify({ projectId: p.id, orgId: p.accountId, projectName: p.name }));
  });' > "$out/.vercel/project.json"

cd "$out"
vercel deploy --prod --yes
