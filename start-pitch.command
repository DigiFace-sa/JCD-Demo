#!/bin/bash
# Double-click to launch the pitch build (macOS). See README › Pitch day.
cd "$(dirname "$0")" || exit 1
if ! command -v node >/dev/null 2>&1; then
  osascript -e 'display alert "Node.js is required" message "Install Node.js (nodejs.org) on this Mac, then double-click start-pitch.command again."'
  exit 1
fi
node scripts/pitch.mjs "$@"
