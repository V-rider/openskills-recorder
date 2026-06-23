#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v pnpm &>/dev/null; then
  corepack enable
  corepack prepare pnpm@9.15.0 --activate
fi

pnpm install
pnpm db:generate
pnpm db:push
pnpm build:packages

echo "Starting demo app :4321, web :3000, desktop..."
pnpm dev
