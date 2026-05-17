#!/usr/bin/env bash
# 1) Build production image with NO Redis / NUXT_REDIS_* at build time (.env excluded).
# 2) Assert baked nitro runtime config has empty redis keys.
# 3) Run app + workers with NUXT_* overrides only (custom Redis on port 6381).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLAYGROUND="$ROOT/playground"
SMOKE_IMAGE="${NUXT_PROCESSOR_SMOKE_IMAGE:-nuxt-processor-smoke:local}"
NITRO_BAKED=".output/server/chunks/nitro/nitro.mjs"
WAIT_JOBS="${WAIT_JOBS:-22}"

# Unset on the host so docker build / local tooling cannot leak into the build step.
REDIS_BUILD_VARS=(
  REDIS_URL REDIS_HOST REDIS_PORT REDIS_PASSWORD REDIS_DB REDIS_USERNAME
  REDIS_LAZY_CONNECT REDIS_CONNECT_TIMEOUT
  NUXT_REDIS_URL NUXT_REDIS_HOST NUXT_REDIS_PORT NUXT_REDIS_PASSWORD NUXT_REDIS_DB
  NUXT_REDIS_USERNAME NUXT_REDIS_LAZY_CONNECT NUXT_REDIS_CONNECT_TIMEOUT
)

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\033[31m✖ %s\033[0m\n' "$*" >&2; exit 1; }
ok() { printf '\033[32m✔ %s\033[0m\n' "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "Missing: $1"
}

assert_no_connection_errors() {
  local logs="$1"
  if echo "$logs" | grep -qiE 'ECONNREFUSED|127\.0\.0\.1:6379'; then
    echo "$logs" >&2
    die "Found Redis connection errors in logs"
  fi
}

assert_jobs_processed() {
  local logs="$1"
  if ! echo "$logs" | grep -q 'processed hello job'; then
    echo "$logs" >&2
    die "Expected hello jobs to be processed"
  fi
  if ! echo "$logs" | grep -q 'processed basic job'; then
    echo "$logs" >&2
    die "Expected basic jobs to be processed"
  fi
  ok "Jobs processed (hello + basic)"
}

build_image_without_redis_env() {
  log "Building production image (no REDIS_* / NUXT_REDIS_* — .env excluded via .dockerignore)"
  log "Image tag: $SMOKE_IMAGE"

  # env -i: no inherited REDIS_* / NUXT_REDIS_* / .env from the host for this build.
  env -i \
    HOME="${HOME:-/tmp}" \
    PATH="${PATH:-/usr/bin:/bin}" \
    docker build \
      --file "$PLAYGROUND/Dockerfile" \
      --tag "$SMOKE_IMAGE" \
      "$ROOT"

  ok "Image built"
}

assert_baked_config_empty() {
  log "Verifying baked runtime config has no Redis from build"

  if ! docker image inspect "$SMOKE_IMAGE" >/dev/null 2>&1; then
    die "Image $SMOKE_IMAGE not found — run build first"
  fi

  local tmp
  tmp="$(mktemp)"
  # No runtime NUXT_* on this container — we only inspect the artifact from build.
  docker run --rm \
    --entrypoint cat \
    "$SMOKE_IMAGE" \
    "$NITRO_BAKED" > "$tmp"

  npx tsx "$ROOT/scripts/assert-baked-redis-empty.ts" "$tmp"
  rm -f "$tmp"
  ok "Baked redis keys are empty; custom runtime values are not in the image"
}

run_runtime_scenario() {
  local name="$1"
  local compose_file="$2"

  log "Runtime scenario: $name"
  export NUXT_PROCESSOR_SMOKE_IMAGE="$SMOKE_IMAGE"

  docker compose -f "$compose_file" down -v --remove-orphans >/dev/null 2>&1 || true

  log "Starting Redis + app (enqueue) + workers (consume) — NUXT_* only on running containers"
  docker compose -f "$compose_file" up -d

  sleep 5
  log "Waiting ${WAIT_JOBS}s for app plugin to enqueue and workers to process (playground/server/plugins/set-intervals.ts)"
  sleep "$WAIT_JOBS"

  local logs
  logs="$(docker compose -f "$compose_file" logs 2>&1)"
  echo "$logs" | tail -45

  assert_no_connection_errors "$logs"
  assert_jobs_processed "$logs"

  docker compose -f "$compose_file" down -v >/dev/null
  ok "$name passed"
}

require_cmd docker
require_cmd node
cd "$PLAYGROUND"

build_image_without_redis_env
assert_baked_config_empty

run_runtime_scenario \
  "NUXT_REDIS_URL at runtime only (redis://redis-runtime:6381/0)" \
  "$PLAYGROUND/compose.runtime.yml"

run_runtime_scenario \
  "NUXT_REDIS_HOST + PORT + DB at runtime only (port 6381)" \
  "$PLAYGROUND/compose.runtime.host.yml"

run_runtime_scenario \
  "NUXT_REDIS_HOST + PORT + DB + PASSWORD at runtime only" \
  "$PLAYGROUND/compose.runtime.password.yml"

run_runtime_scenario \
  "NUXT_REDIS_URL with password at runtime only" \
  "$PLAYGROUND/compose.runtime.url-auth.yml"

run_runtime_scenario \
  "NUXT_REDIS_HOST + PORT + LAZY_CONNECT + CONNECT_TIMEOUT at runtime only" \
  "$PLAYGROUND/compose.runtime.options.yml"

log "All Docker smoke tests passed (build without Redis env → runtime NUXT_* override)"
