#!/usr/bin/env bash
#
# refresh-prices.sh — Automated supermarket price scraping + comparison
#
# Starts Playwright service if not running, scrapes Coles + Woolworths,
# compares against baseline, writes price-comparison.json.
#
# Usage:
#   ./scripts/refresh-prices.sh              # run once
#   ./scripts/refresh-prices.sh --install    # install launchd agent (daily 6am, runs on wake)
#   ./scripts/refresh-prices.sh --uninstall  # remove launchd agent
#   ./scripts/refresh-prices.sh --status     # check agent + last run
#
# Logs to scripts/logs/launchd-stdout.log

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
AR_CRAWL_DIR="/Users/m3untold/Code/ar-crawl"
PLAYWRIGHT_SERVICE="$AR_CRAWL_DIR/playwright-service"
SERVICE_URL="http://localhost:3033"
LOG_DIR="$SCRIPT_DIR/logs"
SCRAPE_DIR="$SCRIPT_DIR/scraped"
OUTPUT="$APP_DIR/src/data/price-comparison.json"
PLIST_NAME="net.earthianlabs.cri-refresh-prices"
PLIST_SRC="$SCRIPT_DIR/$PLIST_NAME.plist"
PLIST_DST="$HOME/Library/LaunchAgents/$PLIST_NAME.plist"

mkdir -p "$LOG_DIR" "$SCRAPE_DIR"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# --- Subcommands ---

install_launchd() {
  # Unload if already loaded
  launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true

  # Symlink plist into LaunchAgents
  mkdir -p "$HOME/Library/LaunchAgents"
  ln -sf "$PLIST_SRC" "$PLIST_DST"

  # Load it
  launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
  echo "Installed launchd agent: $PLIST_NAME"
  echo "Schedule: daily at 6am (runs missed jobs on wake)"
  echo "Logs: $LOG_DIR/launchd-stdout.log, launchd-stderr.log"
  launchctl print "gui/$(id -u)/$PLIST_NAME" 2>/dev/null | head -5 || true
}

uninstall_launchd() {
  launchctl bootout "gui/$(id -u)/$PLIST_NAME" 2>/dev/null || true
  rm -f "$PLIST_DST"
  echo "Removed launchd agent"
}

show_status() {
  echo "=== launchd agent ==="
  if launchctl print "gui/$(id -u)/$PLIST_NAME" > /dev/null 2>&1; then
    local state
    state=$(launchctl print "gui/$(id -u)/$PLIST_NAME" 2>/dev/null | grep "state" || echo "loaded")
    echo "$PLIST_NAME: $state"
    local last_exit
    last_exit=$(launchctl print "gui/$(id -u)/$PLIST_NAME" 2>/dev/null | grep "last exit" || true)
    [ -n "$last_exit" ] && echo "$last_exit"
  else
    echo "Not installed (run --install)"
  fi
  echo ""
  echo "=== Last run ==="
  if [ -f "$LOG_DIR/launchd-stdout.log" ]; then
    echo "Log: $LOG_DIR/launchd-stdout.log"
    tail -5 "$LOG_DIR/launchd-stdout.log"
  else
    echo "No logs yet"
  fi
  echo ""
  echo "=== Price data ==="
  if [ -f "$OUTPUT" ]; then
    local generated
    generated=$(python3 -c "import json; print(json.load(open('$OUTPUT'))['meta']['generated'])" 2>/dev/null || echo "unknown")
    echo "Last generated: $generated"
  else
    echo "No price-comparison.json"
  fi
  echo ""
  echo "=== Playwright service ==="
  if curl -s "$SERVICE_URL/health" > /dev/null 2>&1; then
    echo "Running at $SERVICE_URL"
  else
    echo "Not running (will be started automatically on next run)"
  fi
}

# --- Main scraping flow ---

ensure_playwright() {
  if curl -s "$SERVICE_URL/health" > /dev/null 2>&1; then
    log "Playwright service already running"
    return 0
  fi

  log "Starting Playwright service..."
  cd "$PLAYWRIGHT_SERVICE"
  node server.js &
  local PW_PID=$!
  cd "$APP_DIR"

  # Wait for it to be ready
  local attempts=0
  while ! curl -s "$SERVICE_URL/health" > /dev/null 2>&1; do
    sleep 1
    attempts=$((attempts + 1))
    if [ $attempts -gt 15 ]; then
      log "ERROR: Playwright service failed to start"
      kill $PW_PID 2>/dev/null || true
      return 1
    fi
  done
  log "Playwright service ready (pid $PW_PID)"
  # Store PID so we can clean up if we started it
  echo "$PW_PID" > "$SCRAPE_DIR/.playwright-pid"
}

cleanup_playwright() {
  if [ -f "$SCRAPE_DIR/.playwright-pid" ]; then
    local pid
    pid=$(cat "$SCRAPE_DIR/.playwright-pid")
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping Playwright service (pid $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$SCRAPE_DIR/.playwright-pid"
  fi
}

run_scrape() {
  local today
  today=$(date '+%Y-%m-%d')
  local coles_file="$SCRAPE_DIR/coles-$today.json"
  local woolworths_file="$SCRAPE_DIR/woolworths-$today.json"

  log "=== Price refresh starting ==="

  # Start Playwright if needed
  ensure_playwright
  trap cleanup_playwright EXIT

  # Scrape Coles
  log "Scraping Coles..."
  if node "$SCRIPT_DIR/scrape-coles.mjs" -o "$coles_file" 2>&1; then
    local coles_count
    coles_count=$(python3 -c "import json; print(json.load(open('$coles_file'))['meta']['totalProducts'])" 2>/dev/null || echo "?")
    log "Coles: $coles_count products → $coles_file"
  else
    log "WARNING: Coles scrape failed"
    coles_file=""
  fi

  # Brief pause between retailers
  sleep 3

  # Scrape Woolworths
  log "Scraping Woolworths..."
  if node "$SCRIPT_DIR/scrape-woolworths.mjs" -o "$woolworths_file" 2>&1; then
    local woolworths_count
    woolworths_count=$(python3 -c "import json; print(json.load(open('$woolworths_file'))['meta']['totalProducts'])" 2>/dev/null || echo "?")
    log "Woolworths: $woolworths_count products → $woolworths_file"
  else
    log "WARNING: Woolworths scrape failed"
    woolworths_file=""
  fi

  # Build comparison input list
  local inputs=""
  [ -n "$coles_file" ] && [ -f "$coles_file" ] && inputs="$coles_file"
  [ -n "$woolworths_file" ] && [ -f "$woolworths_file" ] && inputs="$inputs $woolworths_file"

  if [ -z "$inputs" ]; then
    log "ERROR: No scrape data — both retailers failed"
    exit 1
  fi

  # Run comparison
  log "Comparing against baseline..."
  node "$SCRIPT_DIR/compare-prices.mjs" $inputs -o "$OUTPUT" 2>&1
  log "Written: $OUTPUT"

  # Station snapshot for availability gap detection (no Playwright needed)
  log "Collecting station snapshots..."
  if node "$SCRIPT_DIR/snapshot-stations.mjs" 2>&1; then
    log "Station snapshots collected"
  else
    log "WARNING: Station snapshot failed"
  fi

  # Clean up old snapshots (keep 14 days)
  find "$APP_DIR/src/data/station-snapshots" -name "*.json" -mtime +14 -delete 2>/dev/null || true

  # Scrape energy policy news (no Playwright needed)
  log "Scraping energy policy news..."
  local news_file="$APP_DIR/src/data/energy-news.json"
  if node "$SCRIPT_DIR/scrape-energy-news.mjs" -o "$news_file" 2>&1; then
    local news_count
    news_count=$(python3 -c "import json; print(json.load(open('$news_file'))['meta']['totalArticles'])" 2>/dev/null || echo "?")
    log "Energy news: $news_count articles"
  else
    log "WARNING: Energy news scrape failed"
  fi

  # Commit and push to trigger Vercel deploy
  log "Committing and pushing..."
  cd "$APP_DIR"
  git add src/data/price-comparison.json src/data/energy-news.json src/data/station-snapshots/ 2>/dev/null
  if git diff --cached --quiet 2>/dev/null; then
    log "No data changes — skipping commit"
  else
    git commit -m "$(cat <<'COMMITEOF'
chore: daily signal data refresh

Automated scrape via refresh-prices.sh (launchd agent).
Supermarket prices, energy news, station snapshots.
COMMITEOF
    )"
    git push origin main
    log "Pushed to origin/main — Vercel deploy triggered"
  fi
  cd "$APP_DIR"

  # Clean up old scrape files (keep 7 days)
  find "$SCRAPE_DIR" -name "*.json" -mtime +7 -delete 2>/dev/null || true
  # Clean up old logs (keep 30 days)
  find "$LOG_DIR" -name "launchd-*.log" -mtime +30 -delete 2>/dev/null || true

  log "=== Price refresh complete ==="
}

# --- Entry point ---

case "${1:-run}" in
  --install)   install_launchd ;;
  --uninstall) uninstall_launchd ;;
  --status)    show_status ;;
  run|*)       run_scrape ;;
esac
