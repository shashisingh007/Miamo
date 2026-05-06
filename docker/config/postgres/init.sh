#!/bin/bash
# ─── PostgreSQL Init Script ───────────────────────────
# Creates additional databases/extensions for Miamo
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Enable UUID extension
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
    
    -- Create test database for CI
    SELECT 'CREATE DATABASE miamo_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'miamo_test')\gexec
    
    -- Grant permissions
    GRANT ALL PRIVILEGES ON DATABASE miamo_test TO $POSTGRES_USER;
    
    \c miamo_test
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOSQL
