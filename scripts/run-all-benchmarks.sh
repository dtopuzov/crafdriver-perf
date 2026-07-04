#!/usr/bin/env bash
# Clean run of every benchmark suite: wipes old JSON results, runs each
# technology one by one, sleeping between runs so thermal/background load
# from one run doesn't bleed into the next. See README "Fairness rules".
#
# Usage:
#   CHROMEDRIVER_PATH=/path/to/chromedriver ./scripts/run-all-benchmarks.sh
#   (if CHROMEDRIVER_PATH is unset, the script auto-detects the newest
#   craftdriver-managed chromedriver in ~/.cache/craftdriver)
#
# Env knobs: SLEEP_BETWEEN_SECONDS (default 10), PERF_WARMUP, PERF_ITERATIONS,
# PERF_STARTUP_ITERATIONS (see harness/config.ts).
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

RESULTS_DIR="results"
SLEEP_BETWEEN_SECONDS="${SLEEP_BETWEEN_SECONDS:-10}"

echo "==> Removing old JSON results from $RESULTS_DIR/"
rm -f "$RESULTS_DIR"/*.json

if [ -z "${CHROMEDRIVER_PATH:-}" ]; then
  CHROMEDRIVER_PATH=$(ls -t "$HOME"/.cache/craftdriver/chromedriver/*/*/chromedriver 2>/dev/null | head -1)
  if [ -z "$CHROMEDRIVER_PATH" ]; then
    echo "CHROMEDRIVER_PATH is not set and none was found under ~/.cache/craftdriver/chromedriver." >&2
    echo "Set it explicitly, e.g.:" >&2
    echo "  CHROMEDRIVER_PATH=~/.cache/craftdriver/chromedriver/<version>/mac-x64/chromedriver $0" >&2
    exit 1
  fi
  export CHROMEDRIVER_PATH
fi
echo "==> Using CHROMEDRIVER_PATH=$CHROMEDRIVER_PATH"

# wdio needs the pinned Node LTS (see README "Setup") — switch if nvm is available.
if [ -s "$HOME/.nvm/nvm.sh" ]; then
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  nvm use 24
fi

echo "==> Starting fixture server"
npm run serve >/tmp/craftdriver-perf-serve.log 2>&1 &
SERVER_PID=$!
trap 'echo "==> Stopping fixture server (pid $SERVER_PID)"; kill "$SERVER_PID" 2>/dev/null || true' EXIT

echo "==> Waiting for fixture server on http://127.0.0.1:8081"
for _ in $(seq 1 40); do
  if curl -s -o /dev/null http://127.0.0.1:8081/selectors.html; then
    echo "==> Server is up"
    break
  fi
  sleep 0.5
done

TECHS=(
  "bench:craftdriver"
  "bench:craftdriver:optimized"
  "bench:selenium"
  "bench:wdio"
  "bench:playwright"
  "bench:kendo-e2e"
)

first=true
for tech in "${TECHS[@]}"; do
  if [ "$first" = false ]; then
    echo "==> Sleeping ${SLEEP_BETWEEN_SECONDS}s before next technology"
    sleep "$SLEEP_BETWEEN_SECONDS"
  fi
  first=false
  echo "==> Running: npm run $tech"
  npm run "$tech"
done

echo "==> All benchmarks complete. Results in $RESULTS_DIR/"
echo "==> Run 'npm run report' for a comparison table."
