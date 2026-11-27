#!/usr/bin/env bash
# Build backend/app into a Lambda zip (Python 3.12, arm64) and upload it to the
# tennis-players-api function in us-east-1 (next to the Neon database).
#
# Usage:  backend/deploy_lambda.sh
# Needs:  aws CLI logged in, python3 with pip, zip.
set -euo pipefail

FUNCTION="${FUNCTION:-tennis-players-api}"
REGION="${REGION:-us-east-1}"
HERE="$(cd "$(dirname "$0")" && pwd)"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

echo "Installing Linux arm64 dependencies..."
python3 -m pip install --quiet --disable-pip-version-check \
  --target "$BUILD/pkg" \
  --platform manylinux2014_aarch64 --platform manylinux_2_28_aarch64 \
  --implementation cp --python-version 3.12 --only-binary=:all: \
  -r "$HERE/requirements-lambda.txt"

cp -R "$HERE/app" "$BUILD/pkg/app"
# The odds refresh endpoint reuses the scraper's fetch logic (single source of truth).
cp "$HERE/../scraper/college_basketball_odds.py" "$BUILD/pkg/"
find "$BUILD/pkg" -type d -name "__pycache__" -prune -exec rm -rf {} +
(cd "$BUILD/pkg" && zip -qr "$BUILD/lambda.zip" .)
echo "Package size: $(du -h "$BUILD/lambda.zip" | cut -f1)"

if [ "${BUILD_ONLY:-0}" = "1" ]; then
  cp "$BUILD/lambda.zip" "${OUT:-$HERE/lambda.zip}"
  echo "Built ${OUT:-$HERE/lambda.zip} (not uploaded)"
  exit 0
fi

aws lambda update-function-code --region "$REGION" --function-name "$FUNCTION" \
  --zip-file "fileb://$BUILD/lambda.zip" --query 'CodeSize' --output text >/dev/null
aws lambda wait function-updated --region "$REGION" --function-name "$FUNCTION"
echo "Deployed to $FUNCTION ($REGION):"
aws lambda get-function-url-config --region "$REGION" --function-name "$FUNCTION" --query FunctionUrl --output text
