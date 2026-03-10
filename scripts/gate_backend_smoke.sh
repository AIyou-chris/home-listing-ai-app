#!/usr/bin/env bash
set -euo pipefail

BASE="${BASE:-http://127.0.0.1:3002}"

pass() {
  echo "✅ $1"
}

fail() {
  local step="$1"
  local code="${2:-000}"
  echo "❌ $step ($code)"
  exit 1
}

trim_quotes() {
  local value="$1"
  value="${value%\"}"
  value="${value#\"}"
  value="${value%\'}"
  value="${value#\'}"
  printf '%s' "$value"
}

env_value_from_file() {
  local key="$1"
  local file="$2"
  local raw
  raw="$(grep -E "^${key}=" "$file" | tail -n 1 | cut -d'=' -f2- || true)"
  raw="$(trim_quotes "$raw")"
  printf '%s' "$raw"
}

resolve_agent_id() {
  if [ -n "${GATE_AGENT_ID:-}" ]; then
    printf '%s' "$GATE_AGENT_ID"
    return
  fi

  if [ -n "${AGENT_ID:-}" ]; then
    printf '%s' "$AGENT_ID"
    return
  fi

  if [ -f ".env" ]; then
    local from_file
    from_file="$(env_value_from_file "GATE_AGENT_ID" ".env")"
    if [ -n "$from_file" ]; then
      printf '%s' "$from_file"
      return
    fi

    from_file="$(env_value_from_file "AGENT_ID" ".env")"
    if [ -n "$from_file" ]; then
      printf '%s' "$from_file"
      return
    fi

    from_file="$(env_value_from_file "DEFAULT_LEAD_USER_ID" ".env")"
    if [ -n "$from_file" ]; then
      printf '%s' "$from_file"
      return
    fi
  fi
}

AGENT_ID="$(resolve_agent_id || true)"
if [ -z "$AGENT_ID" ]; then
  echo "❌ resolve x-user-id (000)"
  echo "Set one of these before running:"
  echo "1) export GATE_AGENT_ID=\"<existing-agent-user-id>\""
  echo "2) add GATE_AGENT_ID=<existing-agent-user-id> to .env"
  exit 1
fi

REQ_STATUS="000"
REQ_BODY_FILE=""

cleanup_body_file() {
  if [ -n "${REQ_BODY_FILE:-}" ] && [ -f "${REQ_BODY_FILE:-}" ]; then
    rm -f "$REQ_BODY_FILE"
  fi
}
trap cleanup_body_file EXIT

request_json() {
  local method="$1"
  local path="$2"
  local data="${3:-}"
  cleanup_body_file
  REQ_BODY_FILE="$(mktemp)"

  if [ -n "$data" ]; then
    REQ_STATUS="$(curl -sS -o "$REQ_BODY_FILE" -w "%{http_code}" \
      -X "$method" \
      -H "content-type: application/json" \
      -H "x-user-id: $AGENT_ID" \
      --data "$data" \
      "$BASE$path" || echo "000")"
  else
    REQ_STATUS="$(curl -sS -o "$REQ_BODY_FILE" -w "%{http_code}" \
      -X "$method" \
      -H "x-user-id: $AGENT_ID" \
      "$BASE$path" || echo "000")"
  fi
}

wait_for_backend() {
  local retries=30
  local i code
  for i in $(seq 1 "$retries"); do
    code="$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/api/admin/system/health" || echo "000")"
    if [ "$code" = "200" ]; then
      return 0
    fi
    sleep 1
  done
  return 1
}

if ! wait_for_backend; then
  fail "backend startup check" "000"
fi
pass "backend startup check"

step="GET /health (or /)"
request_json "GET" "/health"
if [ "$REQ_STATUS" != "200" ]; then
  request_json "GET" "/"
fi
if [ "$REQ_STATUS" = "200" ]; then
  pass "$step"
else
  fail "$step" "$REQ_STATUS"
fi

step="POST /api/dashboard/listings"
create_payload="$(printf '{"address":"Gate Smoke %s"}' "$(date +%s)")"
request_json "POST" "/api/dashboard/listings" "$create_payload"
if [ "$REQ_STATUS" != "200" ]; then
  fail "$step" "$REQ_STATUS"
fi

LISTING_ID="$(
  node -e 'const fs = require("fs"); try { const body = JSON.parse(fs.readFileSync(process.argv[1], "utf8")); const id = body && body.listing && body.listing.id; if (id) process.stdout.write(String(id)); } catch (_) {}' "$REQ_BODY_FILE"
)"
if [ -z "$LISTING_ID" ]; then
  fail "$step" "$REQ_STATUS"
fi
pass "$step"

step="PATCH /api/dashboard/listings/:id"
request_json "PATCH" "/api/dashboard/listings/$LISTING_ID" '{"status":"published"}'
if [ "$REQ_STATUS" = "200" ]; then
  pass "$step"
else
  fail "$step" "$REQ_STATUS"
fi

step="POST /api/dashboard/listings/:id/sources"
request_json "POST" "/api/dashboard/listings/$LISTING_ID/sources" '{"title":"Gate source","type":"text","content":"Gate smoke source"}'
if [ "$REQ_STATUS" = "200" ]; then
  pass "$step"
else
  fail "$step" "$REQ_STATUS"
fi

step="GET /api/dashboard/listings/:id"
request_json "GET" "/api/dashboard/listings/$LISTING_ID"
if [ "$REQ_STATUS" = "200" ]; then
  pass "$step"
else
  fail "$step" "$REQ_STATUS"
fi

cleanup_body_file
