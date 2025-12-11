#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🧪 Testing full stack with environment isolation...${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Cleanup function
cleanup() {
  echo ""
  echo -e "${YELLOW}🧹 Cleaning up...${NC}"
  
  # Stop all test containers
  docker compose -f docker-compose.yml -f docker-compose.test.yml down -v 2>/dev/null || true
  docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml down -v 2>/dev/null || true
  
  # Remove any orphaned containers
  docker ps -a --filter "name=tech-citizen" --format "{{.Names}}" | xargs -r docker stop 2>/dev/null || true
  docker ps -a --filter "name=tech-citizen" --format "{{.Names}}" | xargs -r docker rm 2>/dev/null || true
  
  echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Trap EXIT to ensure cleanup
trap cleanup EXIT

# Load test environment
if [ -f ".env.test" ]; then
  export $(grep -v '^#' .env.test | xargs)
  echo -e "${GREEN}✅ Loaded .env.test${NC}"
else
  echo -e "${RED}❌ .env.test not found!${NC}"
  exit 1
fi

echo ""
echo -e "${BLUE}📊 Environment Variables:${NC}"
echo "  NODE_ENV: $NODE_ENV"
echo "  KEYCLOAK_URL: $KEYCLOAK_URL"
echo "  KEYCLOAK_PORT: $KEYCLOAK_PORT"
echo "  REDIS_PORT: $REDIS_PORT"
echo ""

# Step 1: Start infrastructure
echo -e "${BLUE}🚀 Step 1: Starting test infrastructure...${NC}"

docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

echo -e "${GREEN}✅ Infrastructure started${NC}"
echo ""

# Step 2: Start Keycloak
echo -e "${BLUE}🔐 Step 2: Starting Keycloak...${NC}"

docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml \
  --env-file infrastructure/keycloak/.env.test up -d

# Wait for Keycloak
echo -e "${YELLOW}⏳ Waiting for Keycloak...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -sf http://localhost:${KEYCLOAK_PORT}/health/ready > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Keycloak is ready on port ${KEYCLOAK_PORT}${NC}"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Keycloak failed to start${NC}"
    docker logs tech-citizen-keycloak-test --tail 50
    exit 1
  fi
  
  sleep 2
done

echo ""

# Step 3: Health checks
echo -e "${BLUE}🏥 Step 3: Running health checks...${NC}"

# Check Keycloak
if curl -sf http://localhost:${KEYCLOAK_PORT}/health/ready > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Keycloak: healthy${NC}"
else
  echo -e "${RED}❌ Keycloak: unhealthy${NC}"
  exit 1
fi

# Check Redis
if docker exec tech-citizen-redis-session-test redis-cli ping > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Redis: healthy${NC}"
else
  echo -e "${YELLOW}⚠️  Redis: not running (optional for some tests)${NC}"
fi

echo ""

# Step 4: Run integration tests
echo -e "${BLUE}🧪 Step 4: Running integration tests...${NC}"

NODE_ENV=test npx jest --config ./jest.integration.config.cjs \
  packages/auth/test/keycloak-complete-flow.integration.test.ts \
  --testMatch="**/*.integration.test.ts"

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Integration tests passed${NC}"
else
  echo -e "${RED}❌ Integration tests failed${NC}"
  exit 1
fi

echo ""

# Step 5: Verify environment isolation
echo -e "${BLUE}🔒 Step 5: Verifying environment isolation...${NC}"

# Check that we're using test ports
KEYCLOAK_CONTAINER_PORT=$(docker port tech-citizen-keycloak-test 8080 | cut -d':' -f2)
if [ "$KEYCLOAK_CONTAINER_PORT" == "$KEYCLOAK_PORT" ]; then
  echo -e "${GREEN}✅ Keycloak using correct test port: $KEYCLOAK_PORT${NC}"
else
  echo -e "${RED}❌ Port mismatch: expected $KEYCLOAK_PORT, got $KEYCLOAK_CONTAINER_PORT${NC}"
  exit 1
fi

REDIS_CONTAINER_PORT=$(docker port tech-citizen-redis-session-test 6379 | cut -d':' -f2)
if [ "$REDIS_CONTAINER_PORT" == "$REDIS_PORT" ]; then
  echo -e "${GREEN}✅ Redis using correct test port: $REDIS_PORT${NC}"
else
  echo -e "${RED}❌ Port mismatch: expected $REDIS_PORT, got $REDIS_CONTAINER_PORT${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}✅ Full stack test completed successfully!${NC}"
echo ""
echo "Summary:"
echo "  - Infrastructure: ✅"
echo "  - Keycloak: ✅"
echo "  - Integration tests: ✅"
echo "  - Environment isolation: ✅"

exit 0
