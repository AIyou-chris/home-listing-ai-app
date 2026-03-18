#!/usr/bin/env bash
set -euo pipefail

BASE_API="${BASE_API:-http://127.0.0.1:3002}"
USER_ID="${USER_ID:-}"
LISTING_ID="${LISTING_ID:-}"
SLUG="${SLUG:-}"

if [[ -z "$USER_ID" || -z "$LISTING_ID" || -z "$SLUG" ]]; then
  echo "FAIL: set BASE_API, USER_ID, LISTING_ID, and SLUG"
  exit 1
fi

pass() {
  echo "PASS: $1"
}

fail() {
  echo "FAIL: $1"
  exit 1
}

share_json="$(curl -sS "$BASE_API/api/dashboard/listings/$LISTING_ID/share-kit" -H "x-user-id: $USER_ID")" || fail "share kit bootstrap request"
echo "$share_json" | jq -e '.share_url and .public_slug' >/dev/null || fail "share kit bootstrap payload"
pass "share kit bootstrap"

public_json="$(curl -sS "$BASE_API/api/public/listings/$SLUG/bootstrap")" || fail "public listing bootstrap request"
echo "$public_json" | jq -e '.ok == true and .listing.public_slug == "'"$SLUG"'"' >/dev/null || fail "public listing bootstrap payload"
pass "public listing bootstrap"

qr_png_headers="$(mktemp)"
curl -sS "$BASE_API/api/dashboard/listings/$LISTING_ID/qr.png?sourceKey=open_house&sourceType=open_house" \
  -H "x-user-id: $USER_ID" \
  -D "$qr_png_headers" \
  -o /tmp/gallery-sharekit-qr.png || fail "qr png request"
grep -qi '^Content-Type: image/png' "$qr_png_headers" || fail "qr png content-type"
pass "qr png"

qr_svg_headers="$(mktemp)"
curl -sS "$BASE_API/api/dashboard/listings/$LISTING_ID/qr.svg?sourceKey=open_house&sourceType=open_house" \
  -H "x-user-id: $USER_ID" \
  -D "$qr_svg_headers" \
  -o /tmp/gallery-sharekit-qr.svg || fail "qr svg request"
grep -qi '^Content-Type: image/svg+xml' "$qr_svg_headers" || fail "qr svg content-type"
pass "qr svg"

flyer_headers="$(mktemp)"
curl -sS -L "$BASE_API/api/dashboard/listings/$LISTING_ID/open-house-flyer.pdf" \
  -H "x-user-id: $USER_ID" \
  -D "$flyer_headers" \
  -o /tmp/gallery-sharekit-flyer.pdf || fail "open house flyer request"
grep -qi '^Content-Type: application/pdf' "$flyer_headers" || fail "open house flyer content-type"
pass "open house flyer pdf"

sign_headers="$(mktemp)"
curl -sS -L "$BASE_API/api/dashboard/listings/$LISTING_ID/sign-rider.pdf" \
  -H "x-user-id: $USER_ID" \
  -D "$sign_headers" \
  -o /tmp/gallery-sharekit-sign-rider.pdf || fail "sign rider request"
grep -qi '^Content-Type: application/pdf' "$sign_headers" || fail "sign rider content-type"
pass "sign rider pdf"

rm -f "$qr_png_headers" "$qr_svg_headers" "$flyer_headers" "$sign_headers"
echo "All gallery/share kit smoke tests passed."
