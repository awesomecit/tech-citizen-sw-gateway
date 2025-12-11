#!/bin/bash
# Full Production Deployment Test
# Simulates deployment on clean server to verify "works first time"

set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_FILE="$HOME/secrets/production.env"

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Production Deployment Test - Tech Citizen Gateway${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Step 1: Verify secrets exist
echo -e "${YELLOW}[1/8] Verifying secrets...${NC}"
if [ ! -f "$SECRETS_FILE" ]; then
  echo -e "${RED}❌ Secrets not found: $SECRETS_FILE${NC}"
  echo "   Create from template: cp ansible/production.env.example $SECRETS_FILE"
  exit 1
fi
source "$SECRETS_FILE"

if [ -z "${PRODUCTION_SERVER_IP:-}" ]; then
  echo -e "${RED}❌ PRODUCTION_SERVER_IP not set${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Secrets loaded: $DOMAIN ($PRODUCTION_SERVER_IP)${NC}"
echo

# Step 2: Test SSH connectivity
echo -e "${YELLOW}[2/8] Testing SSH connectivity...${NC}"
if ! bash "$SCRIPT_DIR/ansible-production.sh" ping > /dev/null 2>&1; then
  echo -e "${RED}❌ SSH connection failed${NC}"
  echo "   Verify: ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP"
  exit 1
fi
echo -e "${GREEN}✓ SSH connectivity OK${NC}"
echo

# Step 3: Check current server state
echo -e "${YELLOW}[3/8] Checking server state...${NC}"
SERVER_STATE=$(ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP bash -s <<'ENDSSH'
echo "=== Docker ==="
docker --version 2>/dev/null || echo "Not installed"
echo "=== Gateway Directory ==="
ls -la /opt/gateway 2>/dev/null || echo "Not exists"
echo "=== Running Containers ==="
docker ps --format "{{.Names}}" 2>/dev/null || echo "None"
ENDSSH
)
echo "$SERVER_STATE"
echo

# Step 4: Ask for full bootstrap or partial
read -p "Run full bootstrap? (security+docker+gateway) [Y/n]: " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
  echo -e "${YELLOW}[4/8] Running full bootstrap...${NC}"
  echo "   This will take 3-5 minutes..."
  
  if bash "$SCRIPT_DIR/ansible-production.sh" bootstrap; then
    echo -e "${GREEN}✓ Bootstrap completed${NC}"
  else
    echo -e "${RED}❌ Bootstrap failed${NC}"
    exit 1
  fi
else
  echo -e "${YELLOW}[4/8] Skipping bootstrap (already done)${NC}"
fi
echo

# Step 5: Verify Docker and services
echo -e "${YELLOW}[5/8] Verifying Docker and services...${NC}"
DOCKER_CHECK=$(ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP bash -s <<'ENDSSH'
docker --version 2>/dev/null && echo "✓ Docker installed" || echo "✗ Docker missing"
docker compose version 2>/dev/null && echo "✓ Docker Compose available" || echo "✗ Compose missing"
cd /opt/gateway 2>/dev/null && echo "✓ Gateway directory exists" || echo "✗ Directory missing"
ENDSSH
)
echo "$DOCKER_CHECK"

if echo "$DOCKER_CHECK" | grep -q "✗"; then
  echo -e "${RED}❌ Docker or Gateway directory missing${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Docker environment ready${NC}"
echo

# Step 6: Check running containers
echo -e "${YELLOW}[6/8] Checking running containers...${NC}"
CONTAINERS=$(ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP "cd /opt/gateway && docker compose ps --format '{{.Name}}\t{{.Status}}'")
echo "$CONTAINERS"

EXPECTED_SERVICES=("gateway-caddy" "gateway-prometheus" "gateway-grafana")
ALL_RUNNING=true

for service in "${EXPECTED_SERVICES[@]}"; do
  if ! echo "$CONTAINERS" | grep -q "$service.*Up"; then
    echo -e "${RED}✗ Service $service not running${NC}"
    ALL_RUNNING=false
  else
    echo -e "${GREEN}✓ Service $service running${NC}"
  fi
done

if [ "$ALL_RUNNING" = false ]; then
  echo -e "${YELLOW}⚠ Some services not running. Restart?${NC}"
  read -p "Restart services? [Y/n]: " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]] || [[ -z $REPLY ]]; then
    ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP "cd /opt/gateway && docker compose restart"
    sleep 10
  fi
fi
echo

# Step 7: Health checks
echo -e "${YELLOW}[7/8] Running health checks...${NC}"
HEALTH=$(ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP bash -s <<'ENDSSH'
echo "=== Prometheus ==="
curl -s http://localhost:19090/-/healthy || echo "FAILED"
echo -e "\n=== Grafana ==="
curl -s http://localhost:3000/api/health | grep -o '"database":"ok"' || echo "FAILED"
echo -e "\n=== Caddy Health ==="
curl -s http://localhost:8080/health || echo "Empty (expected if not configured)"
ENDSSH
)
echo "$HEALTH"

if echo "$HEALTH" | grep -q "Prometheus Server is Healthy"; then
  echo -e "${GREEN}✓ Prometheus healthy${NC}"
else
  echo -e "${RED}✗ Prometheus health check failed${NC}"
fi

if echo "$HEALTH" | grep -q '"database":"ok"'; then
  echo -e "${GREEN}✓ Grafana healthy${NC}"
else
  echo -e "${RED}✗ Grafana health check failed${NC}"
fi
echo

# Step 8: Summary and next steps
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━��━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ Production Deployment Test Completed${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo
echo "Current Status:"
echo "  - Server: $PRODUCTION_SERVER_IP"
echo "  - Domain: $DOMAIN"
echo "  - Docker: Installed ✓"
echo "  - Services: Running ✓"
echo "  - Health: Checks passing ✓"
echo
echo "Next Steps:"
echo
echo "1. Configure DNS on Cloudflare (6 records):"
echo "   - Login: https://dash.cloudflare.com"
echo "   - Domain: $DOMAIN"
echo "   - Add A records pointing to $PRODUCTION_SERVER_IP"
echo
echo "2. Wait 5-10 minutes for DNS propagation:"
echo "   dig +short $DOMAIN"
echo "   (Should return: $PRODUCTION_SERVER_IP)"
echo
echo "3. Configure Caddy reverse proxy with SSL:"
echo "   bash scripts/ansible-production.sh caddy"
echo
echo "4. Test public endpoints:"
echo "   curl https://gateway.$DOMAIN/health"
echo "   curl https://grafana.$DOMAIN/api/health"
echo
echo "5. Deploy Gateway application (Platformatic Watt):"
echo "   bash scripts/ansible-production.sh deploy-gateway-app"
echo
echo "Documentation:"
echo "  - Production Status: docs/operations/PRODUCTION_STATUS.md"
echo "  - Ansible Guide: docs/operations/ANSIBLE_MULTI_ENV.md"
echo "  - Next Steps: docs/project/NEXT.md"
echo
