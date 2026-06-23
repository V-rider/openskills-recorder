#!/usr/bin/env bash
# Create public GitHub repo and push. Requires: gh auth login
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REPO_NAME="${GITHUB_REPO_NAME:-openskills-recorder}"
GITHUB_USER="${GITHUB_USER:-}"

if ! command -v gh &>/dev/null; then
  echo "Install GitHub CLI: brew install gh"
  exit 1
fi

if ! gh auth status &>/dev/null; then
  echo "Run: gh auth login"
  exit 1
fi

if [[ -z "$GITHUB_USER" ]]; then
  GITHUB_USER="$(gh api user -q .login)"
fi

if ! git rev-parse --git-dir &>/dev/null; then
  git init -b main
fi

if ! git rev-parse HEAD &>/dev/null 2>&1; then
  echo "No commits found. Commit first, then re-run this script."
  exit 1
fi

if git remote get-url origin &>/dev/null 2>&1; then
  echo "Remote origin already set:"
  git remote get-url origin
else
  echo "Creating public repo ${GITHUB_USER}/${REPO_NAME}..."
  gh repo create "$REPO_NAME" --public --source=. --remote=origin --push \
    --description "Local-first browser workflow recorder → inspectable skills → deterministic Playwright replay"
fi

if ! git remote get-url origin | grep -q "github.com"; then
  git push -u origin HEAD
fi

echo ""
echo "Published: https://github.com/${GITHUB_USER}/${REPO_NAME}"
echo "Update README CI badge to:"
echo "  [![CI](https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/workflows/ci.yml/badge.svg)](https://github.com/${GITHUB_USER}/${REPO_NAME}/actions/workflows/ci.yml)"
