#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-3000}"
HOST="${HOST:-localhost}"
BASE_URL="http://${HOST}:${PORT}"

SMOKE_SLEEP_SECONDS_NODE="${SMOKE_SLEEP_SECONDS_NODE:-4}"
SMOKE_SLEEP_SECONDS_BUN="${SMOKE_SLEEP_SECONDS_BUN:-4}"
SMOKE_SLEEP_SECONDS_DENO="${SMOKE_SLEEP_SECONDS_DENO:-4}"
SMOKE_SLEEP_SECONDS_WORKERS="${SMOKE_SLEEP_SECONDS_WORKERS:-6}"

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

log() {
  printf "%s\n" "$*"
}

fail() {
  log "Error: $*"
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

kill_port() {
  if command -v lsof >/dev/null 2>&1; then
    lsof -ti":${PORT}" | xargs kill -9 2>/dev/null || true
  fi
}

curl_ok() {
  local path="$1"
  local url="${BASE_URL}${path}"

  curl -fsS "$url" >/dev/null
}

run_example() {
  local runtime="$1"
  local dir="${PROJECT_ROOT}/examples/${runtime}"
  local server_pid=""

  log ""
  log "=== Testing ${runtime} ==="

  if [[ ! -d "$dir" ]]; then
    fail "Missing example directory: ${dir}"
  fi

  kill_port

  (
    cd "$dir"

    case "$runtime" in
      node)
        require_cmd pnpm
        pnpm install
        pnpm run build
        pnpm run start &
        server_pid=$!
        sleep "$SMOKE_SLEEP_SECONDS_NODE"
        ;;
      bun)
        require_cmd bun
        require_cmd bunx
        rm -rf node_modules bun.lockb
        bun install
        bun run build
        bun run start &
        server_pid=$!
        sleep "$SMOKE_SLEEP_SECONDS_BUN"
        ;;
      deno)
        require_cmd deno
        deno task build
        deno task start &
        server_pid=$!
        sleep "$SMOKE_SLEEP_SECONDS_DENO"
        ;;
      workers)
        require_cmd pnpm
        pnpm install
        pnpm run build
        pnpm run dev &
        server_pid=$!
        sleep "$SMOKE_SLEEP_SECONDS_WORKERS"
        ;;
      *)
        fail "Unknown runtime: ${runtime}"
        ;;
    esac

    log "Testing endpoints (${BASE_URL})..."
    curl_ok "/" && log "✓ /"
    curl_ok "/about" && log "✓ /about"
    curl_ok "/about/ooo" && log "✓ /about/ooo"
    curl_ok "/api/health" && log "✓ /api/health"

    if [[ -n "$server_pid" ]]; then
      kill "$server_pid" 2>/dev/null || true

      if [[ "$runtime" == "bun" ]]; then
        pkill -9 -f bunx 2>/dev/null || true
      fi

      if [[ "$runtime" == "deno" ]]; then
        pkill -9 -f "deno.*sxo start" 2>/dev/null || true
      fi

      if [[ "$runtime" == "workers" ]]; then
        pkill -9 -f "sxo dev" 2>/dev/null || true
      fi
    fi
  )
}

main() {
  require_cmd curl

  log "Testing runtimes against examples/*"
  log "Base URL: ${BASE_URL}"

  run_example node
  run_example bun
  run_example deno
  run_example workers

  log ""
  log "=== All runtime tests passed! ==="
}

main "$@"
