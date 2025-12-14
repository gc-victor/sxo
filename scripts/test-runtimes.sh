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

validate_content() {
  local path="$1"
  local pattern="$2"
  local description="$3"
  local url="${BASE_URL}${path}"

  if ! curl -fsS "$url" | grep -q "$pattern"; then
    fail "Content validation failed for ${path}: expected '${description}'"
  fi
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
    
    # Home page validation (runtime-specific titles and content)
    curl_ok "/" && log "✓ /"
    case "$runtime" in
      node)
        validate_content "/" "<title>SXO Node.js Example</title>" "Node.js title"
        validate_content "/" "<h1>Welcome to SXO</h1>" "Welcome heading"
        validate_content "/" "<p>Running on Node.js</p>" "Node.js runtime text"
        ;;
      bun)
        validate_content "/" "<title>SXO Bun Example</title>" "Bun title"
        validate_content "/" "<h1>Welcome to SXO</h1>" "Welcome heading"
        validate_content "/" "<p>Running on Bun</p>" "Bun runtime text"
        ;;
      deno)
        validate_content "/" "<title>SXO Deno Example</title>" "Deno title"
        validate_content "/" "<h1>Welcome to SXO</h1>" "Welcome heading"
        validate_content "/" "<p>Running on Deno</p>" "Deno runtime text"
        ;;
      workers)
        validate_content "/" "<title>SXO Cloudflare Workers Example</title>" "Workers title"
        validate_content "/" "<h1>Welcome to SXO</h1>" "Welcome heading"
        validate_content "/" "<p>Running on Cloudflare Workers</p>" "Workers runtime text"
        ;;
    esac
    log "✓ / content validated"
    
    # About page validation
    curl_ok "/about" && log "✓ /about"
    validate_content "/about" "<title>About - SXO</title>" "About title"
    validate_content "/about" "<h1>About</h1>" "About heading"
    validate_content "/about" "<p>This is the about page.</p>" "About description"
    log "✓ /about content validated"
    
    # About single-param route validation
    curl_ok "/about/ooo" && log "✓ /about/ooo (single-param)"
    validate_content "/about/ooo" "<title>About ooo - SXO</title>" "About slug title"
    validate_content "/about/ooo" "<h1>About: ooo</h1>" "About slug heading"
    validate_content "/about/ooo" "This is a dynamic page for slug: <strong>ooo</strong>" "About slug dynamic content"
    log "✓ /about/ooo content validated"
    
    # Multi-param shop routes with content validation
    curl_ok "/shop/electronics/laptop" && log "✓ /shop/electronics/laptop (multi-param)"
    validate_content "/shop/electronics/laptop" "<title>electronics - laptop - SXO</title>" "title format: category - product"
    validate_content "/shop/electronics/laptop" "<h1>Shop: electronics / laptop</h1>" "Shop heading"
    validate_content "/shop/electronics/laptop" "Category: <strong>electronics</strong>" "category paragraph"
    validate_content "/shop/electronics/laptop" "Product: <strong>laptop</strong>" "product paragraph"
    log "✓ /shop/electronics/laptop content validated"
    
    curl_ok "/shop/books/javascript-guide" && log "✓ /shop/books/javascript-guide (multi-param)"
    validate_content "/shop/books/javascript-guide" "<title>books - javascript-guide - SXO</title>" "title format: category - product"
    validate_content "/shop/books/javascript-guide" "<h1>Shop: books / javascript-guide</h1>" "Shop heading"
    validate_content "/shop/books/javascript-guide" "Category: <strong>books</strong>" "category paragraph"
    validate_content "/shop/books/javascript-guide" "Product: <strong>javascript-guide</strong>" "product paragraph"
    log "✓ /shop/books/javascript-guide content validated"
    
    # API health endpoint validation (runtime-specific JSON)
    curl_ok "/api/health" && log "✓ /api/health"
    case "$runtime" in
      node)
        validate_content "/api/health" '"status":"ok"' "health status OK"
        validate_content "/api/health" '"runtime":"node"' "Node.js runtime in health"
        ;;
      bun)
        validate_content "/api/health" '"status":"ok"' "health status OK"
        validate_content "/api/health" '"runtime":"bun"' "Bun runtime in health"
        ;;
      deno)
        validate_content "/api/health" '"status":"ok"' "health status OK"
        validate_content "/api/health" '"runtime":"deno"' "Deno runtime in health"
        ;;
      workers)
        validate_content "/api/health" '"status":"ok"' "health status OK"
        validate_content "/api/health" '"runtime":"cloudflare-workers"' "Workers runtime in health"
        ;;
    esac
    log "✓ /api/health content validated"

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

    # Ensure port is fully released before next runtime
    kill_port
    sleep 1
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
