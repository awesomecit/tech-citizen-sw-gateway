#!/bin/bash
# Load production environment variables from .env.production
# Usage: source scripts/load-production-env.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ENV_FILE=".env.production"

# Check if .env.production exists
if [ ! -f "$ENV_FILE" ]; then
  echo -e "${RED}ERROR: $ENV_FILE not found${NC}"
  echo -e "${YELLOW}Copy .env.production.template to .env.production and fill with actual values${NC}"
  echo ""
  echo "  cp .env.production.template .env.production"
  echo "  nano .env.production"
  exit 1
fi

# Load environment variables
echo -e "${GREEN}Loading production environment variables...${NC}"
export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs)

# Validate required variables
REQUIRED_VARS=(
  "PRODUCTION_SERVER_IP"
  "PRODUCTION_DOMAIN"
  "KEYCLOAK_ADMIN_PASSWORD"
  "POSTGRES_PASSWORD"
  "REDIS_PASSWORD"
  "JWT_SECRET"
  "SESSION_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo -e "${RED}ERROR: Missing required environment variables:${NC}"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi

echo -e "${GREEN}✓ Production environment loaded successfully${NC}"
echo ""
echo "Server: $PRODUCTION_SERVER_USER@$PRODUCTION_SERVER_IP"
echo "Domain: $PRODUCTION_DOMAIN"
