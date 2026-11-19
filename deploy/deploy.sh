#!/usr/bin/env bash
set -euo pipefail
export PATH=/opt/atlis-runtime/node/bin:/usr/bin:/bin
export NEXT_TELEMETRY_DISABLED=1
sha=${1:?Commit SHA required}
[[ "$sha" =~ ^[0-9a-f]{40}$ ]] || exit 2
base=/opt/atlis-next
exec 9>"$base/deploy.lock"
flock -n 9 || { echo 'Another deployment is running'; exit 1; }
release="$base/releases/$sha"
test ! -e "$release" || { echo 'Release already exists; use a new commit'; exit 1; }
mkdir "$release"
tar -xzf "$base/incoming/$sha.tar.gz" -C "$release"
cd "$release"
ln -s /etc/atlis-cloud.env .env.local
npm ci --no-audit --no-fund
npm run test:email
npm run test:auth
npm run migrate
# Recipient discovery is an explicit admin action; deployments must not restore deleted mappings.
npm run schema
npm run build
previous=$(readlink -f "$base/current" || true)
ln -s "$release" "$base/current.next"
mv -Tf "$base/current.next" "$base/current"
healthy=false
if sudo /usr/bin/systemctl restart atlis-next.service; then
  for attempt in {1..30}; do
    if curl --fail --silent --max-time 5 http://127.0.0.1:3000/api/health > /dev/null; then
      if node scripts/smoke-dashboard.mjs; then healthy=true; fi
      break
    fi
    sleep 2
  done
fi
if [ "$healthy" != true ]; then
  if [ -n "$previous" ] && [ -d "$previous" ]; then
    ln -s "$previous" "$base/current.rollback"
    mv -Tf "$base/current.rollback" "$base/current"
    sudo /usr/bin/systemctl restart atlis-next.service
  fi
  echo 'Health check failed; previous app release restored when available. Database migrations are additive and were not reversed.'
  exit 1
fi
echo "Deployed $sha"
