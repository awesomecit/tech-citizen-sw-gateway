#!/usr/bin/env bash
set -euo pipefail

# Test Infrastructure Cleanup
# Usage: bash scripts/test-infra-stop.sh [service1] [service2] ...
# Example: bash scripts/test-infra-stop.sh keycloak redis

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Set environment suffix for test containers (same as start script)
export COMPOSE_ENV_SUFFIX="-test"
# Use project name for network/volume isolation (Docker Compose standard)
export COMPOSE_PROJECT_NAME="keycloak-test"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
  echo -e "${GREEN}[INFO]${NC} $*"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $*" >&2
}

# Default services if none specified
SERVICES="${*:-keycloak redis}"

log_info "Stopping test infrastructure: $SERVICES"

# Stop services based on requested list
for SERVICE in $SERVICES; do
  case "$SERVICE" in
    keycloak)
      log_info "Stopping Keycloak..."
      cd "$PROJECT_ROOT/infrastructure/keycloak"
      # First, force stop and remove containers by name (bypass compose project context)
      docker stop "tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}" "tech-citizen-redis-session${COMPOSE_ENV_SUFFIX}" 2>/dev/null || true
      docker rm "tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}" "tech-citizen-redis-session${COMPOSE_ENV_SUFFIX}" 2>/dev/null || true
      # Then cleanup networks and volumes via compose
      docker compose -f docker-compose.keycloak.yml down -v --remove-orphans || true
      ;;
      
    redis)
      log_info "Stopping Redis..."
      cd "$PROJECT_ROOT"
      docker compose stop redis-test || true
      docker compose rm -f redis-test || true
      ;;
      
    postgres)
      log_info "Stopping PostgreSQL..."
      cd "$PROJECT_ROOT"
      docker compose stop postgres-test || true
      docker compose rm -f postgres-test || true
      ;;
      
    rabbitmq)
      log_info "Stopping RabbitMQ..."
      cd "$PROJECT_ROOT"
      docker compose stop rabbitmq-test || true
      docker compose rm -f rabbitmq-test || true
      ;;
      
    *)
      log_info "Skipping unknown service: $SERVICE"
      ;;
  esac
done

log_info "Test infrastructure stopped!"
