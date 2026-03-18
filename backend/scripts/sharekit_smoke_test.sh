#!/usr/bin/env bash
set -euo pipefail

BASE_API="${BASE_API:-http://127.0.0.1:3002}"
LISTING_ID="${LISTING_ID:-95ead1fb-e9f3-4f3e-b45d-425b5f828ba0}"
USER_ID="${USER_ID:-1c72dde2-b1d2-4426-a2c5-b6277d93c5d7}"
TMP_DIR="${TMP_DIR:-/tmp/sharekit-smoke}"

mkdir -p "$TMP_DIR"

pass() { echo "PASS: $1"; }
fail() { echo "FAIL: $1"; exit 1; }

echo "Share Kit smoke test"
echo "BASE_API=$BASE_API"
echo "LISTING_ID=$LISTING_ID"
echo "USER_ID=$USER_ID"
echo

share_status="$(curl -sS -o "$TMP_DIR/share-kit.json" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/share-kit" \
  -H "x-user-id: $USER_ID")"
if [[ "$share_status" == "200" ]]; then
  jq '{status,is_published,public_slug,share_url}' "$TMP_DIR/share-kit.json"
  pass "share kit bootstrap"
else
  cat "$TMP_DIR/share-kit.json" || true
  fail "share kit bootstrap ($share_status)"
fi

share_url="$(jq -r '.share_url // ""' "$TMP_DIR/share-kit.json")"
if [[ "$share_url" =~ /l/[^/]+$ ]]; then
  pass "share url format"
else
  fail "share url format ($share_url)"
fi

qr_status="$(curl -sS -o "$TMP_DIR/qr.json" -w "%{http_code}" \
  -X POST "$BASE_API/api/dashboard/listings/$LISTING_ID/generate-qr" \
  -H "Content-Type: application/json" \
  -H "x-user-id: $USER_ID" \
  -d '{"source_key":"open_house","source_type":"open_house"}')"
if [[ "$qr_status" == "200" ]]; then
  jq '{source_key,source_type,tracked_url}' "$TMP_DIR/qr.json"
  pass "qr bootstrap"
else
  cat "$TMP_DIR/qr.json" || true
  fail "qr bootstrap ($qr_status)"
fi

qr_png_status="$(curl -sS -D "$TMP_DIR/open-house-qr.png.headers" -o "$TMP_DIR/open-house-qr.png" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/qr.png?agentId=$USER_ID&sourceKey=open_house&sourceType=open_house" \
  -H "x-user-id: $USER_ID")"
qr_png_type="$(file -b --mime-type "$TMP_DIR/open-house-qr.png" 2>/dev/null || true)"
qr_png_header_type="$(tr -d '\r' < "$TMP_DIR/open-house-qr.png.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$qr_png_status" == "200" && "$qr_png_type" == "image/png" && "$qr_png_header_type" == image/png* ]]; then
  pass "qr png"
else
  fail "qr png ($qr_png_status, $qr_png_type, $qr_png_header_type)"
fi

qr_svg_status="$(curl -sS -D "$TMP_DIR/open-house-qr.svg.headers" -o "$TMP_DIR/open-house-qr.svg" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/qr.svg?agentId=$USER_ID&sourceKey=open_house&sourceType=open_house" \
  -H "x-user-id: $USER_ID")"
qr_svg_prefix="$(head -c 4 "$TMP_DIR/open-house-qr.svg" 2>/dev/null || true)"
qr_svg_header_type="$(tr -d '\r' < "$TMP_DIR/open-house-qr.svg.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$qr_svg_status" == "200" && "$qr_svg_prefix" == "<svg" && "$qr_svg_header_type" == image/svg+xml* ]]; then
  pass "qr svg"
else
  fail "qr svg ($qr_svg_status, $qr_svg_header_type)"
fi

flyer_status="$(curl -sS -L -D "$TMP_DIR/open-house-flyer.pdf.headers" -o "$TMP_DIR/open-house-flyer.pdf" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/open-house-flyer.pdf?agentId=$USER_ID" \
  -H "x-user-id: $USER_ID")"
flyer_header_type="$(tr -d '\r' < "$TMP_DIR/open-house-flyer.pdf.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$flyer_status" == "200" && "$flyer_header_type" == application/pdf* ]]; then
  ls -lh "$TMP_DIR/open-house-flyer.pdf"
  pass "flyer pdf"
else
  fail "flyer pdf ($flyer_status, $flyer_header_type)"
fi

property_report_status="$(curl -sS -L -D "$TMP_DIR/property-report.pdf.headers" -o "$TMP_DIR/property-report.pdf" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/property-report.pdf?agentId=$USER_ID" \
  -H "x-user-id: $USER_ID")"
property_report_type="$(tr -d '\r' < "$TMP_DIR/property-report.pdf.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$property_report_status" == "200" && "$property_report_type" == application/pdf* ]]; then
  ls -lh "$TMP_DIR/property-report.pdf"
  pass "property report pdf"
else
  fail "property report pdf ($property_report_status, $property_report_type)"
fi

fair_housing_status="$(curl -sS -L -D "$TMP_DIR/fair-housing-review.pdf.headers" -o "$TMP_DIR/fair-housing-review.pdf" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/fair-housing-review.pdf?agentId=$USER_ID" \
  -H "x-user-id: $USER_ID")"
fair_housing_type="$(tr -d '\r' < "$TMP_DIR/fair-housing-review.pdf.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$fair_housing_status" == "200" && "$fair_housing_type" == application/pdf* ]]; then
  pass "fair housing review pdf"
else
  fail "fair housing review pdf ($fair_housing_status, $fair_housing_type)"
fi

light_cma_status="$(curl -sS -L -D "$TMP_DIR/light-cma.pdf.headers" -o "$TMP_DIR/light-cma.pdf" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/light-cma.pdf?agentId=$USER_ID" \
  -H "x-user-id: $USER_ID")"
light_cma_type="$(tr -d '\r' < "$TMP_DIR/light-cma.pdf.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$light_cma_status" == "200" && "$light_cma_type" == application/pdf* ]]; then
  pass "light cma pdf"
else
  fail "light cma pdf ($light_cma_status, $light_cma_type)"
fi

ig_post_status="$(curl -sS -D "$TMP_DIR/ig-post.png.headers" -o "$TMP_DIR/ig-post.png" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/social-asset.png?agentId=$USER_ID&format=ig_post" \
  -H "x-user-id: $USER_ID")"
ig_post_type="$(tr -d '\r' < "$TMP_DIR/ig-post.png.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$ig_post_status" == "200" && "$ig_post_type" == image/png* ]]; then
  pass "ig post png"
else
  fail "ig post png ($ig_post_status, $ig_post_type)"
fi

ig_story_status="$(curl -sS -D "$TMP_DIR/ig-story.png.headers" -o "$TMP_DIR/ig-story.png" -w "%{http_code}" \
  "$BASE_API/api/dashboard/listings/$LISTING_ID/social-asset.png?agentId=$USER_ID&format=ig_story" \
  -H "x-user-id: $USER_ID")"
ig_story_type="$(tr -d '\r' < "$TMP_DIR/ig-story.png.headers" | awk -F': ' 'tolower($1)=="content-type"{print $2}' | tail -n1)"
if [[ "$ig_story_status" == "200" && "$ig_story_type" == image/png* ]]; then
  pass "ig story png"
else
  fail "ig story png ($ig_story_status, $ig_story_type)"
fi

echo
echo "All Share Kit smoke tests passed."
