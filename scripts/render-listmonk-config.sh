#!/bin/sh
set -eu

: "${LISTMONK_DB_PASSWORD:?set LISTMONK_DB_PASSWORD in .env}"

case "$LISTMONK_DB_PASSWORD" in
  *"'"*)
    echo "LISTMONK_DB_PASSWORD cannot contain single quote (') in this starter setup." >&2
    exit 1
    ;;
esac

cat > /tmp/config.toml <<CONFIG
[app]
address = "0.0.0.0:9000"

[db]
host = "db"
port = 5432
user = "listmonk"
password = '$LISTMONK_DB_PASSWORD'
database = "listmonk"
ssl_mode = "disable"
max_open = 25
max_idle = 25
max_lifetime = "300s"
CONFIG
