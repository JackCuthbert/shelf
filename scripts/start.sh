#!/bin/sh
set -eu

mkdir -p /data/icons
chown -R app:app /data
if [ "$(id -u)" = "0" ]; then
  exec su-exec app "$0" "$@"
fi
if ! touch /data/.write-check 2>/dev/null; then
  echo "Hometime startup failed: /data is not writable." >&2
  exit 1
fi
rm /data/.write-check
export DATABASE_URL="file:/data/app.db"
unset HOSTNAME
echo "Applying database migrations..."
npx prisma migrate deploy
echo "Starting Hometime..."
exec node server.js
