#!/usr/bin/env bash
# Bootstrap SQLite schema then start Next.js for Playwright E2E.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

mkdir -p openskills-data

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (set by playwright.config.ts)" >&2
  exit 1
fi

pnpm db:push
exec pnpm --filter @openskills/web dev
