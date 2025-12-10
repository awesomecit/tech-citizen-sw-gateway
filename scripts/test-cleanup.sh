#!/bin/bash

# Colors
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Cleaning up all test environments...${NC}"

# Stop and remove Keycloak test containers + volumes
echo "  ↳ Stopping Keycloak test environment..."
KEYCLOAK_PORT=8091 REDIS_PORT=6381 docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml down -v 2>/dev/null || true

# Stop and remove Keycloak dev containers (if running)
echo "  ↳ Stopping Keycloak dev environment..."
docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml down -v 2>/dev/null || true

# Clean orphaned containers
echo "  ↳ Removing orphaned containers..."
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml down --remove-orphans 2>/dev/null || true

# Clean Redis test data (if Redis is still running elsewhere)
if command -v redis-cli &> /dev/null; then
  echo "  ↳ Flushing Redis test DB (if accessible)..."
  redis-cli -h localhost -p 6381 -a dev-redis-password -n 15 FLUSHDB 2>/dev/null || true
fi

echo -e "${GREEN}✅ Cleanup complete!${NC}"
