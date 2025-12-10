#!/bin/bash
# Startup script for Staging environment
# Ensures infrastructure is ready and demo users exist

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🚀 Tech Citizen Gateway - Staging Startup"
echo "=========================================="
echo ""

# Load staging environment
if [ -f "$PROJECT_ROOT/.env.staging" ]; then
  echo "📦 Loading staging environment..."
  export $(grep -v '^#' "$PROJECT_ROOT/.env.staging" | xargs)
  echo "   ✅ Environment loaded"
else
  echo "⚠️  No .env.staging found, using defaults"
fi

# Check Keycloak readiness
echo ""
echo "🔍 Checking Keycloak..."
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8090}"
MAX_RETRIES=30
RETRY=0

while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -sf "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; then
    echo "   ✅ Keycloak ready at $KEYCLOAK_URL"
    break
  fi
  RETRY=$((RETRY+1))
  echo "   ⏳ Waiting for Keycloak... ($RETRY/$MAX_RETRIES)"
  sleep 2
done

if [ $RETRY -eq $MAX_RETRIES ]; then
  echo "   ❌ Keycloak not ready after ${MAX_RETRIES} attempts"
  echo "   💡 Start Keycloak: docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml up -d"
  exit 1
fi

# Check Redis
echo ""
echo "🔍 Checking Redis..."
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6380}"

if nc -z "$REDIS_HOST" "$REDIS_PORT" 2>/dev/null; then
  echo "   ✅ Redis ready at $REDIS_HOST:$REDIS_PORT"
else
  echo "   ❌ Redis not reachable at $REDIS_HOST:$REDIS_PORT"
  echo "   💡 Start Redis: docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml up -d"
  exit 1
fi

# Ensure demo users
echo ""
if [ "$SKIP_DEMO_USERS" != "true" ]; then
  bash "$SCRIPT_DIR/ensure-demo-users.sh" staging
else
  echo "⏭️  Skipping demo users (SKIP_DEMO_USERS=true)"
fi

# Start gateway
echo ""
echo "🚀 Starting gateway..."
cd "$PROJECT_ROOT"

if [ "$DRY_RUN" = "true" ]; then
  echo "   ℹ️  DRY_RUN mode - not starting gateway"
  echo ""
  echo "To start manually:"
  echo "  npm run dev"
else
  exec npm run dev
fi
