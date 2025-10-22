#!/bin/bash

# Apply database migration using psql
# Usage: ./apply-migration.sh <migration-file>

# Load environment variables
set -a
source ../backend/.env
set +a

if [ -z "$1" ]; then
  echo "Usage: ./apply-migration.sh <migration-file>"
  echo "Example: ./apply-migration.sh 003_update_form_templates_schema.sql"
  exit 1
fi

MIGRATION_FILE="migrations/$1"

if [ ! -f "$MIGRATION_FILE" ]; then
  echo "❌ Migration file not found: $MIGRATION_FILE"
  exit 1
fi

if [ -z "$DATABASE_URL" ]; then
  echo "❌ DATABASE_URL not found in .env file"
  exit 1
fi

echo "🚀 Applying migration: $1"
echo ""

psql "$DATABASE_URL" -f "$MIGRATION_FILE"

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration applied successfully!"
else
  echo ""
  echo "❌ Migration failed!"
  exit 1
fi
