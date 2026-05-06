#!/bin/bash
# PostgreSQL initialization script for Miamo
# Creates extensions and configures the database

set -e

echo "Initializing Miamo database..."

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";
    ALTER DATABASE $POSTGRES_DB SET timezone TO 'UTC';
EOSQL

echo "Miamo database initialized."
