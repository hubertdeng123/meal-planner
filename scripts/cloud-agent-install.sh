#!/usr/bin/env bash
# Idempotent Cloud Agent dependency install. Safe to run more than once.
set -euo pipefail

ROOT="/workspace"
if [ ! -f "${ROOT}/backend/pyproject.toml" ]; then
  ROOT="$(pwd)"
fi
cd "$ROOT"

if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
fi
if [ -x "${HOME}/.local/bin/uv" ]; then
  sudo ln -sf "${HOME}/.local/bin/uv" /usr/local/bin/uv
fi

if ! command -v psql >/dev/null 2>&1; then
  sudo apt-get update
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y postgresql postgresql-contrib
fi

if ! command -v pnpm >/dev/null 2>&1; then
  corepack enable
  corepack prepare pnpm@10.33.4 --activate
  sudo ln -sf "$(command -v pnpm)" /usr/local/bin/pnpm
fi

cd "$ROOT/backend"
uv sync --frozen

cd "$ROOT/frontend"
pnpm install --frozen-lockfile
