#!/bin/bash
# Deploy Gateway to production server
# Usage: bash scripts/deploy-production.sh

set -e

# Load production environment variables
source scripts/load-production-env.sh

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Tech Citizen Gateway - Production Deploy${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Confirm deployment
echo -e "${YELLOW}Target server: ${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}${NC}"
echo -e "${YELLOW}Domain: ${PRODUCTION_DOMAIN}${NC}"
echo ""
read -p "Are you sure you want to deploy to PRODUCTION? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}Starting deployment...${NC}"

# Step 1: Test SSH connection
echo -e "${BLUE}[1/8] Testing SSH connection...${NC}"
ssh -i "$PRODUCTION_SSH_KEY_PATH" -o ConnectTimeout=10 \
  "${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}" "echo 'SSH connection successful'" || {
  echo -e "${RED}ERROR: Cannot connect to server${NC}"
  exit 1
}

# Step 2: Run pre-deployment checks
echo -e "${BLUE}[2/8] Running pre-deployment checks...${NC}"
npm run verify:full || {
  echo -e "${RED}ERROR: Pre-deployment checks failed${NC}"
  exit 1
}

# Step 3: Build production Docker images
echo -e "${BLUE}[3/8] Building production Docker images...${NC}"
docker compose -f docker-compose.yml build || {
  echo -e "${RED}ERROR: Docker build failed${NC}"
  exit 1
}

# Step 4: Create deployment package
echo -e "${BLUE}[4/8] Creating deployment package...${NC}"
DEPLOY_DIR="deploy-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DEPLOY_DIR"

# Copy necessary files
cp docker-compose.yml "$DEPLOY_DIR/"
cp -r infrastructure/ "$DEPLOY_DIR/"
cp -r services/ "$DEPLOY_DIR/"
cp -r packages/ "$DEPLOY_DIR/"
cp package.json "$DEPLOY_DIR/"
cp watt.json "$DEPLOY_DIR/"

# Create production .env file (without sensitive data in git)
cat > "$DEPLOY_DIR/.env" <<EOF
NODE_ENV=production
LOG_LEVEL=info

# Keycloak
KEYCLOAK_ADMIN=$KEYCLOAK_ADMIN_USER
KEYCLOAK_ADMIN_PASSWORD=$KEYCLOAK_ADMIN_PASSWORD
KEYCLOAK_CLIENT_SECRET=$KEYCLOAK_CLIENT_SECRET
KC_DB_PASSWORD=$KEYCLOAK_DB_PASSWORD

# Database
POSTGRES_USER=$POSTGRES_USER
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=$POSTGRES_DB

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD

# RabbitMQ
RABBITMQ_DEFAULT_USER=$RABBITMQ_USER
RABBITMQ_DEFAULT_PASS=$RABBITMQ_PASSWORD
RABBITMQ_ERLANG_COOKIE=$RABBITMQ_ERLANG_COOKIE

# Gateway
JWT_SECRET=$JWT_SECRET
SESSION_SECRET=$SESSION_SECRET
DOMAIN=$PRODUCTION_DOMAIN
API_URL=$PRODUCTION_API_URL

# Email
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_USER=$SMTP_USER
SMTP_PASSWORD=$SMTP_PASSWORD
SMTP_FROM=$SMTP_FROM_EMAIL

# CORS
CORS_ORIGINS=$CORS_ALLOWED_ORIGINS

# Monitoring
GRAFANA_ADMIN_PASSWORD=$GRAFANA_ADMIN_PASSWORD
EOF

# Create tarball
tar -czf "${DEPLOY_DIR}.tar.gz" "$DEPLOY_DIR"
rm -rf "$DEPLOY_DIR"

echo -e "${GREEN}✓ Deployment package created: ${DEPLOY_DIR}.tar.gz${NC}"

# Step 5: Upload to server
echo -e "${BLUE}[5/8] Uploading to server...${NC}"
scp -i "$PRODUCTION_SSH_KEY_PATH" \
  "${DEPLOY_DIR}.tar.gz" \
  "${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}:/tmp/" || {
  echo -e "${RED}ERROR: Upload failed${NC}"
  rm -f "${DEPLOY_DIR}.tar.gz"
  exit 1
}

rm -f "${DEPLOY_DIR}.tar.gz"

# Step 6: Extract and prepare on server
echo -e "${BLUE}[6/8] Extracting on server...${NC}"
ssh -i "$PRODUCTION_SSH_KEY_PATH" \
  "${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}" << 'ENDSSH'
set -e

cd /tmp
tar -xzf deploy-*.tar.gz
DEPLOY_DIR=$(ls -d deploy-* | grep -v tar.gz | head -n 1)

# Stop existing services
if [ -d "/opt/gateway" ]; then
  echo "Stopping existing services..."
  cd /opt/gateway
  docker compose down || true
fi

# Backup current installation
if [ -d "/opt/gateway" ]; then
  echo "Backing up current installation..."
  mv /opt/gateway "/opt/gateway.backup.$(date +%Y%m%d-%H%M%S)"
fi

# Deploy new version
echo "Deploying new version..."
mv "/tmp/$DEPLOY_DIR" /opt/gateway
cd /opt/gateway

# Set permissions
chown -R root:root /opt/gateway
chmod 600 .env

echo "Deployment extracted successfully"
ENDSSH

# Step 7: Start services on server
echo -e "${BLUE}[7/8] Starting services...${NC}"
ssh -i "$PRODUCTION_SSH_KEY_PATH" \
  "${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}" << 'ENDSSH'
set -e

cd /opt/gateway

# Pull latest images (if needed)
docker compose pull

# Start services
docker compose up -d

# Wait for health checks
echo "Waiting for services to be healthy..."
sleep 10

# Check service status
docker compose ps

echo "Services started successfully"
ENDSSH

# Step 8: Verify deployment
echo -e "${BLUE}[8/8] Verifying deployment...${NC}"
sleep 5

# Test health endpoint
HEALTH_URL="https://${PRODUCTION_DOMAIN}/health"
echo "Testing health endpoint: $HEALTH_URL"

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo -e "${GREEN}✓ Health check passed${NC}"
else
  echo -e "${RED}✗ Health check failed (HTTP $HTTP_CODE)${NC}"
  echo -e "${YELLOW}Check logs on server:${NC}"
  echo "  ssh -i $PRODUCTION_SSH_KEY_PATH ${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}"
  echo "  cd /opt/gateway && docker compose logs -f"
  exit 1
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Gateway URL: https://${PRODUCTION_DOMAIN}"
echo "Metrics: https://${PRODUCTION_DOMAIN}/metrics"
echo "Grafana: https://${PRODUCTION_DOMAIN}:3001 (admin / ${GRAFANA_ADMIN_PASSWORD})"
echo ""
echo "To view logs:"
echo "  ssh -i $PRODUCTION_SSH_KEY_PATH ${PRODUCTION_SERVER_USER}@${PRODUCTION_SERVER_IP}"
echo "  cd /opt/gateway && docker compose logs -f gateway"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Verify all services are running"
echo "  2. Check Grafana dashboards"
echo "  3. Monitor logs for errors"
echo "  4. Test API endpoints"
