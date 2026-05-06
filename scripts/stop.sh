#!/bin/bash
# Stop all Miamo dev services
cd "$(dirname "$0")/.."

echo "Stopping Miamo services..."

# Kill by PID file
if [ -f .miamo-pids ]; then
  while read -r pid; do
    kill -9 "$pid" 2>/dev/null
  done < .miamo-pids
  rm -f .miamo-pids
fi

# Kill by port (safety net)
lsof -ti:3100,3200,3201,3202,3203,3205 2>/dev/null | xargs kill -9 2>/dev/null || true

# Kill any stragglers
pkill -9 -f "tsx.*services/" 2>/dev/null || true
pkill -9 -f "next dev" 2>/dev/null || true

echo "✓ All services stopped."
