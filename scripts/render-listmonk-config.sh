#!/bin/sh
set -eu

: "${LISTMONK_DB_PASSWORD:?set LISTMONK_DB_PASSWORD in .env}"

if printf '%s' "$LISTMONK_DB_PASSWORD" | grep -q '[[:cntrl:]]'; then
  echo "LISTMONK_DB_PASSWORD must not contain control characters (newline, tab, carriage return, etc.)." >&2
  exit 1
fi

DB_PASS_ESCAPED=$(printf '%s' "$LISTMONK_DB_PASSWORD" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

cat > /tmp/config.toml <<CONFIG
[app]
address = "0.0.0.0:9000"

[db]
host = "db"
port = 5432
user = "listmonk"
password = "$DB_PASS_ESCAPED"
database = "listmonk"
ssl_mode = "disable"
max_open = 25
max_idle = 25
max_lifetime = "300s"
CONFIG
