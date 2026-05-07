#!/bin/bash
# check-ci.sh — Verify the latest CI run on main is green before releasing.
# Usage: bash scripts/check-ci.sh
# Called automatically by: npm run release:safe (and release:patch:safe, etc.)
set -e

BRANCH="main"
REPO="tosin2013/documcp"

echo "Checking CI status for $REPO @ $BRANCH..."

# Require gh CLI
if ! command -v gh &>/dev/null; then
  echo "ERROR: GitHub CLI (gh) is required. Install it from https://cli.github.com"
  exit 1
fi

# Fetch the latest CI run on main
RUN_JSON=$(gh run list \
  --repo "$REPO" \
  --branch "$BRANCH" \
  --workflow "CI" \
  --limit 1 \
  --json status,conclusion,headSha,createdAt,displayTitle)

if [ -z "$RUN_JSON" ] || [ "$RUN_JSON" = "[]" ]; then
  echo "ERROR: No CI runs found for $REPO @ $BRANCH."
  exit 1
fi

STATUS=$(echo "$RUN_JSON" | python3 -c "import sys,json; r=json.load(sys.stdin)[0]; print(r['status'])")
CONCLUSION=$(echo "$RUN_JSON" | python3 -c "import sys,json; r=json.load(sys.stdin)[0]; print(r['conclusion'])")
SHA=$(echo "$RUN_JSON" | python3 -c "import sys,json; r=json.load(sys.stdin)[0]; print(r['headSha'][:8])")
TITLE=$(echo "$RUN_JSON" | python3 -c "import sys,json; r=json.load(sys.stdin)[0]; print(r['displayTitle'])")

echo "  Latest run: $TITLE ($SHA)"
echo "  Status:     $STATUS"
echo "  Conclusion: $CONCLUSION"

if [ "$STATUS" != "completed" ] || [ "$CONCLUSION" != "success" ]; then
  echo ""
  echo "ERROR: CI is not green ($STATUS/$CONCLUSION)."
  echo "Fix the failing tests before creating a release."
  echo ""
  echo "Check status at: https://github.com/$REPO/actions"
  exit 1
fi

# Also verify the current HEAD matches the last green CI run SHA
CURRENT_SHA=$(git rev-parse --short HEAD)
if [ "$SHA" != "$CURRENT_SHA" ]; then
  echo ""
  echo "WARNING: The latest green CI run ($SHA) does not match your current HEAD ($CURRENT_SHA)."
  echo "There may be uncommitted local changes or CI has not yet run for your latest commit."
  echo "Wait for CI to complete before releasing, or push your changes first."
  exit 1
fi

echo ""
echo "CI is green for HEAD ($CURRENT_SHA). Safe to release."
