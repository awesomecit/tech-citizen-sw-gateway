#!/usr/bin/env bash
set -euo pipefail

# Test Infrastructure Startup
# Usage: bash scripts/test-infra-start.sh [service1] [service2] ...
# Example: bash scripts/test-infra-start.sh keycloak redis

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Set environment suffix for test containers
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

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $*"
}

# Default services if none specified
SERVICES="${*:-keycloak redis}"

log_info "Starting test infrastructure: $SERVICES"

# Start services based on requested list
for SERVICE in $SERVICES; do
  case "$SERVICE" in
    keycloak)
      log_info "Starting Keycloak + Redis on ports 8090/6379..."
      cd "$PROJECT_ROOT/infrastructure/keycloak"
      
      # Check if already running and healthy
      if docker ps --filter "name=tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}" --filter "status=running" --format '{{.Names}}' | grep -q "tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}"; then
        if curl -sf http://localhost:8090/health/ready > /dev/null 2>&1; then
          log_info "Keycloak already running and healthy, skipping startup"
          continue  # Skip to next service
        else
          log_info "Keycloak running but not ready, restarting..."
          docker compose -f docker-compose.keycloak.yml restart
        fi
      else
        log_info "Starting containers..."
        docker compose -f docker-compose.keycloak.yml up -d --remove-orphans
      fi
      
      # Monitor both containers logs in parallel (only if starting fresh)
      docker logs -f "tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}" 2>&1 | sed 's/^/[keycloak] /' &
      KEYCLOAK_LOG_PID=$!
      docker logs -f "tech-citizen-redis-session${COMPOSE_ENV_SUFFIX}" 2>&1 | sed 's/^/[redis] /' &
      REDIS_LOG_PID=$!
      
      # Wait for Keycloak ready (can take 90-120s)
      log_info "Waiting for Keycloak health check (max 120s)..."
      for i in {1..120}; do
        if curl -sf http://localhost:8090/health/ready > /dev/null 2>&1; then
          log_info "Keycloak ready after ${i}s!"
          kill $KEYCLOAK_LOG_PID 2>/dev/null || true
          kill $REDIS_LOG_PID 2>/dev/null || true
          break
        fi
        if [ "$i" -eq 120 ]; then
          kill $KEYCLOAK_LOG_PID 2>/dev/null || true
          kill $REDIS_LOG_PID 2>/dev/null || true
          log_error "Keycloak failed to start within 120s"
          log_error "Last 50 lines of Keycloak logs:"
          docker logs --tail 50 "tech-citizen-keycloak${COMPOSE_ENV_SUFFIX}" 2>&1
          log_error "Last 20 lines of Redis logs:"
          docker logs --tail 20 "tech-citizen-redis-session${COMPOSE_ENV_SUFFIX}" 2>&1
          exit 1
        fi
        sleep 1
      done
      ;;
      
    redis)
      log_info "Starting Redis on port 6381..."
      cd "$PROJECT_ROOT"
      docker compose up -d redis-test
      
      # Monitor logs in background
      docker logs -f tech-citizen-sw-gateway-redis-test-1 2>&1 | sed 's/^/[redis] /' &
      REDIS_LOG_PID=$!
      
      # Wait for Redis ready
      log_info "Waiting for Redis..."
      for i in {1..30}; do
        if docker exec -i tech-citizen-sw-gateway-redis-test-1 redis-cli -a dev-redis-password ping > /dev/null 2>&1; then
          log_info "Redis ready!"
          kill $REDIS_LOG_PID 2>/dev/null || true
          break
        fi
        if [ "$i" -eq 30 ]; then
          kill $REDIS_LOG_PID 2>/dev/null || true
          log_error "Redis failed to start within 30s"
          log_error "Last 20 lines of logs:"
          docker logs --tail 20 tech-citizen-sw-gateway-redis-test-1 2>&1
          exit 1
        fi
        sleep 1
      done
      ;;
      
    postgres)
      log_info "Starting PostgreSQL on port 5433..."
      cd "$PROJECT_ROOT"
      docker compose up -d postgres-test
      
      # Wait for PostgreSQL ready
      log_info "Waiting for PostgreSQL..."
      for i in {1..30}; do
        if docker exec -i tech-citizen-sw-gateway-postgres-test-1 pg_isready -U gateway_test > /dev/null 2>&1; then
          log_info "PostgreSQL ready!"
          break
        fi
        if [ "$i" -eq 30 ]; then
          log_error "PostgreSQL failed to start within 30s"
          exit 1
        fi
        sleep 1
      done
      ;;
      
    rabbitmq)
      log_info "Starting RabbitMQ on port 5673..."
      cd "$PROJECT_ROOT"
      docker compose up -d rabbitmq-test
      
      # Wait for RabbitMQ ready
      log_info "Waiting for RabbitMQ..."
      for i in {1..30}; do
        if docker exec -i tech-citizen-sw-gateway-rabbitmq-test-1 rabbitmqctl status > /dev/null 2>&1; then
          log_info "RabbitMQ ready!"
          break
        fi
        if [ "$i" -eq 30 ]; then
          log_error "RabbitMQ failed to start within 30s"
          exit 1
        fi
        sleep 1
      done
      ;;
      
    *)
      log_warn "Unknown service: $SERVICE, skipping"
      ;;
  esac
done

log_info "Test infrastructure ready!"
