#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load test environment variables
if [ -f .env.test ]; then
  export $(grep -v '^#' .env.test | xargs)
  echo -e "${GREEN}✅ Loaded .env.test${NC}"
fi

# Cleanup function
cleanup() {
  echo -e "${YELLOW}🧹 Cleaning up test environment...${NC}"
  docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml --env-file infrastructure/keycloak/.env.test down -v
}

# Trap EXIT to ensure cleanup always runs
trap cleanup EXIT

echo -e "${YELLOW}🚀 Starting Keycloak test environment...${NC}"

# Start Keycloak test instance with test environment
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml --env-file infrastructure/keycloak/.env.test up -d

# Wait for Keycloak to be healthy
echo -e "${YELLOW}⏳ Waiting for Keycloak to be ready...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

KEYCLOAK_PORT=${KEYCLOAK_PORT:-8091}

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if curl -f http://localhost:${KEYCLOAK_PORT}/health/ready >/dev/null 2>&1; then
    echo -e "${GREEN}✅ Keycloak is ready on port ${KEYCLOAK_PORT}!${NC}"
    break
  fi
  
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    echo -e "${RED}❌ Keycloak failed to start after ${MAX_RETRIES} attempts${NC}"
    docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml logs keycloak-test
    exit 1
  fi
  
  echo -e "${YELLOW}   Attempt $RETRY_COUNT/$MAX_RETRIES...${NC}"
  sleep 2
done

# Run tests
echo -e "${YELLOW}🧪 Running all tests...${NC}"
npm test

TEST_EXIT_CODE=$?

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
else
  echo -e "${RED}❌ Some tests failed (exit code: $TEST_EXIT_CODE)${NC}"
fi

exit $TEST_EXIT_CODE
