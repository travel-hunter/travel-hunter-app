#!/usr/bin/env bash
set -euo pipefail

export POSTGRES_DB="${POSTGRES_DB:-travelhunter}"
export POSTGRES_USER="${POSTGRES_USER:-travelhunter}"
export POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-travelhunter}"
export PGDATA="${PGDATA:-/var/lib/postgresql/data/pgdata}"

mkdir -p /var/log/travel-hunter /var/log/postgresql /var/run/postgresql "$PGDATA"

chown -R postgres:postgres /var/lib/postgresql
chown -R postgres:postgres /var/log/postgresql
chown -R postgres:postgres /var/run/postgresql

if [ ! -s "$PGDATA/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."

  chown -R postgres:postgres "$PGDATA"
  su postgres -c "initdb -D '$PGDATA'"

  cat >> "$PGDATA/postgresql.conf" <<'EOF'
listen_addresses = '127.0.0.1'
port = 5432
timezone = 'Asia/Seoul'
log_timezone = 'Asia/Seoul'
EOF

  su postgres -c "pg_ctl -D '$PGDATA' -w start"

  su postgres -c "psql --username postgres <<SQL
CREATE USER ${POSTGRES_USER} WITH PASSWORD '${POSTGRES_PASSWORD}';
CREATE DATABASE ${POSTGRES_DB} OWNER ${POSTGRES_USER};
SQL"

  su postgres -c "pg_ctl -D '$PGDATA' -m fast -w stop"
else
  echo "PostgreSQL data directory already exists."
fi

echo "Starting Travel-Hunter services..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/travel-hunter.conf