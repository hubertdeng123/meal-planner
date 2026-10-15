#!/usr/bin/env bash
# Boot PostgreSQL, apply migrations, and start the API and Vite dev servers.
set -euo pipefail

ROOT="/workspace"
if [ ! -f "${ROOT}/backend/pyproject.toml" ]; then
  ROOT="$(pwd)"
fi
cd "$ROOT"

start_postgres() {
  if pg_isready -q; then
    return 0
  fi
  if command -v pg_lsclusters >/dev/null 2>&1; then
    local ver name
    ver="$(pg_lsclusters --no-header | awk 'NR==1 {print $1}')"
    name="$(pg_lsclusters --no-header | awk 'NR==1 {print $2}')"
    if [ -n "${ver}" ] && [ -n "${name}" ]; then
      sudo pg_ctlcluster "${ver}" "${name}" start || true
    fi
  fi
  if ! pg_isready -q; then
    sudo service postgresql start || true
  fi
  local _
  for _ in $(seq 1 30); do
    if pg_isready -q; then
      return 0
    fi
    sleep 1
  done
  echo "PostgreSQL did not become ready" >&2
  pg_lsclusters || true
  return 1
}

start_postgres

sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER USER postgres WITH PASSWORD 'password';"
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='meal_planner'" | grep -q 1; then
  sudo -u postgres createdb meal_planner
fi

if [ ! -f "${ROOT}/.env" ]; then
  jwt="${JWT_SECRET_KEY:-}"
  if [ -z "${jwt}" ]; then
    jwt="$(openssl rand -hex 32)"
  fi
  cat > "${ROOT}/.env" <<EOF
DATABASE_URL=${DATABASE_URL:-postgresql://postgres:password@localhost:5432/meal_planner}
JWT_SECRET_KEY=${jwt}
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
LLM_PROVIDER=${LLM_PROVIDER:-auto}
GROK_API_KEY=${GROK_API_KEY:-}
GROK_MODEL=${GROK_MODEL:-grok-4-1-fast-reasoning}
GROK_BASE_URL=${GROK_BASE_URL:-https://api.x.ai/v1}
TOGETHER_API_KEY=${TOGETHER_API_KEY:-}
TOGETHER_MODEL=${TOGETHER_MODEL:-moonshotai/Kimi-K2.5}
TOGETHER_BASE_URL=${TOGETHER_BASE_URL:-https://api.together.xyz/v1}
VITE_API_URL=${VITE_API_URL:-http://localhost:8000}
BASE_URL=${BASE_URL:-http://localhost:5173}
EOF
  chmod 600 "${ROOT}/.env"
fi

if [ ! -f "${ROOT}/frontend/.env" ]; then
  echo "VITE_API_URL=${VITE_API_URL:-http://localhost:8000}" > "${ROOT}/frontend/.env"
fi

cd "${ROOT}/backend"
uv run alembic upgrade head

# BraintrustSpanProcessor refuses to import without a key. A local placeholder
# lets the API boot; export to Braintrust stays inactive until a real key is set.
if [ -z "${BRAINTRUST_API_KEY:-}" ]; then
  echo "BRAINTRUST_API_KEY is unset; starting the API with a local placeholder so tracing stays optional."
  BRAINTRUST_API_KEY="local-dev-unset"
fi

if ! tmux has-session -t backend 2>/dev/null; then
  tmux new-session -d -s backend \
    "cd '${ROOT}/backend' && BRAINTRUST_API_KEY='${BRAINTRUST_API_KEY}' PYTHONUNBUFFERED=1 uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --log-level info 2>&1 | tee /tmp/hungry-helper-backend.log"
fi

if ! tmux has-session -t frontend 2>/dev/null; then
  tmux new-session -d -s frontend \
    "cd '${ROOT}/frontend' && pnpm exec vite --host 0.0.0.0 --port 5173 2>&1 | tee /tmp/hungry-helper-frontend.log"
fi

ready=0
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:8000/health" >/dev/null && curl -sf "http://127.0.0.1:5173" >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done

if [ "${ready}" -ne 1 ]; then
  echo "Dev servers did not become ready" >&2
  echo "--- backend log ---" >&2
  tail -n 80 /tmp/hungry-helper-backend.log >&2 || true
  echo "--- frontend log ---" >&2
  tail -n 80 /tmp/hungry-helper-frontend.log >&2 || true
  exit 1
fi

echo "Hungry Helper is up: API http://127.0.0.1:8000  UI http://127.0.0.1:5173"
