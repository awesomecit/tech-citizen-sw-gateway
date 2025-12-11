#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Validating environment configuration...${NC}"
echo ""

ERRORS=0
WARNINGS=0

# Function to check if file exists
check_file() {
  if [ ! -f "$1" ]; then
    echo -e "${RED}❌ Missing: $1${NC}"
    ((ERRORS++))
    return 1
  fi
  echo -e "${GREEN}✅ Found: $1${NC}"
  return 0
}

# Function to check if variable exists in file
check_var() {
  local file=$1
  local var=$2
  
  if ! grep -q "^${var}=" "$file" 2>/dev/null; then
    echo -e "${YELLOW}⚠️  Missing variable '$var' in $file${NC}"
    ((WARNINGS++))
    return 1
  fi
  return 0
}

# Function to check port conflicts
check_port() {
  local file=$1
  local var=$2
  local port=$3
  
  local actual_port=$(grep "^${var}=" "$file" 2>/dev/null | cut -d'=' -f2)
  
  if [ "$actual_port" != "$port" ]; then
    echo -e "${YELLOW}⚠️  Port mismatch in $file: $var expected $port, got $actual_port${NC}"
    ((WARNINGS++))
    return 1
  fi
  return 0
}

echo "## Checking required .env files..."
echo ""

# Required files
check_file ".env.example"
check_file ".env.development"
check_file ".env.test"
check_file ".env.staging"
check_file "infrastructure/keycloak/.env.test.example"

echo ""
echo "## Checking required variables..."
echo ""

# Required variables in all environments
REQUIRED_VARS=(
  "NODE_ENV"
  "LOG_LEVEL"
  "KEYCLOAK_URL"
  "KEYCLOAK_PORT"
  "REDIS_PORT"
)

for env_file in .env.development .env.test .env.staging; do
  echo "Checking $env_file..."
  for var in "${REQUIRED_VARS[@]}"; do
    check_var "$env_file" "$var"
  done
  echo ""
done

echo "## Checking port allocation..."
echo ""

# Port matrix validation
echo "Development (.env.development):"
check_port ".env.development" "KEYCLOAK_PORT" "8090"
check_port ".env.development" "REDIS_PORT" "6380"

echo ""
echo "Test (.env.test):"
check_port ".env.test" "KEYCLOAK_PORT" "8091"
check_port ".env.test" "REDIS_PORT" "6381"

echo ""
echo "Staging (.env.staging):"
check_port ".env.staging" "KEYCLOAK_PORT" "8090"

echo ""
echo "## Checking docker-compose env_file directives..."
echo ""

# Check docker-compose files have env_file
for compose_file in docker-compose.yml docker-compose.test.yml docker-compose.staging.yml; do
  if [ -f "$compose_file" ]; then
    if ! grep -q "env_file:" "$compose_file"; then
      echo -e "${YELLOW}⚠️  No env_file directive in $compose_file${NC}"
      ((WARNINGS++))
    else
      echo -e "${GREEN}✅ $compose_file has env_file directive${NC}"
    fi
  fi
done

echo ""
echo "## Checking for hardcoded values in code..."
echo ""

# Check for hardcoded ports in TypeScript files
if grep -r "localhost:8090\|localhost:8091" packages/ services/ --include="*.ts" 2>/dev/null | grep -v "test" | grep -v ".env"; then
  echo -e "${RED}❌ Found hardcoded localhost URLs in source code (should use env vars)${NC}"
  ((ERRORS++))
else
  echo -e "${GREEN}✅ No hardcoded localhost URLs in source code${NC}"
fi

echo ""
echo "## Summary"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All environment checks passed!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  Validation completed with $WARNINGS warnings${NC}"
  exit 0
else
  echo -e "${RED}❌ Validation failed with $ERRORS errors and $WARNINGS warnings${NC}"
  exit 1
fi
