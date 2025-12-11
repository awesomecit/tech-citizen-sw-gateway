#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔄 Testing environment switching...${NC}"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Test environment loading
test_env_loading() {
  local env_name=$1
  local env_file=$2
  
  echo -e "${BLUE}Testing $env_name environment...${NC}"
  
  if [ ! -f "$env_file" ]; then
    echo -e "${RED}❌ $env_file not found${NC}"
    return 1
  fi
  
  # Load environment
  export $(grep -v '^#' "$env_file" | xargs)
  
  # Verify NODE_ENV
  if [ "$NODE_ENV" != "$env_name" ]; then
    echo -e "${RED}❌ NODE_ENV mismatch: expected $env_name, got $NODE_ENV${NC}"
    return 1
  fi
  
  echo -e "${GREEN}✅ NODE_ENV: $NODE_ENV${NC}"
  echo -e "${GREEN}✅ KEYCLOAK_URL: $KEYCLOAK_URL${NC}"
  echo -e "${GREEN}✅ KEYCLOAK_PORT: $KEYCLOAK_PORT${NC}"
  echo -e "${GREEN}✅ REDIS_PORT: $REDIS_PORT${NC}"
  
  # Clear for next test
  unset NODE_ENV KEYCLOAK_URL KEYCLOAK_PORT REDIS_PORT
  
  echo ""
  return 0
}

# Test each environment
FAILED=0

test_env_loading "development" ".env.development" || ((FAILED++))
test_env_loading "test" ".env.test" || ((FAILED++))
test_env_loading "staging" ".env.staging" || ((FAILED++))

echo ""
echo "## Testing docker-compose env_file loading..."
echo ""

# Test docker-compose config for each environment
for env in "yml:development" "test.yml:test" "staging.yml:staging"; do
  compose_file=$(echo $env | cut -d':' -f1)
  env_name=$(echo $env | cut -d':' -f2)
  
  echo -e "${BLUE}Checking docker-compose.$compose_file...${NC}"
  
  if [ "$compose_file" == "yml" ]; then
    compose_cmd="docker-compose.yml"
  else
    compose_cmd="docker-compose.$compose_file"
  fi
  
  if docker compose -f $compose_cmd config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.$compose_file is valid${NC}"
  else
    echo -e "${RED}❌ docker-compose.$compose_file has errors${NC}"
    ((FAILED++))
  fi
  echo ""
done

echo ""
echo "## Summary"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ All environment tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ $FAILED environment tests failed${NC}"
  exit 1
fi
