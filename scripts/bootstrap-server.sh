#!/bin/bash
# Bootstrap production server - Single entry point
# Usage: bash scripts/bootstrap-server.sh [options]
#
# Options:
#   --skip-discovery    Skip server discovery
#   --skip-security     Skip security hardening
#   --skip-docker       Skip Docker installation
#   --deploy-only       Only deploy Gateway (skip setup)
#   --audit-only        Only run security audit

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Default options
SKIP_DISCOVERY=false
SKIP_SECURITY=false
SKIP_DOCKER=false
DEPLOY_ONLY=false
AUDIT_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-discovery)
      SKIP_DISCOVERY=true
      shift
      ;;
    --skip-security)
      SKIP_SECURITY=true
      shift
      ;;
    --skip-docker)
      SKIP_DOCKER=true
      shift
      ;;
    --deploy-only)
      DEPLOY_ONLY=true
      shift
      ;;
    --audit-only)
      AUDIT_ONLY=true
      shift
      ;;
    --help)
      echo "Usage: bash scripts/bootstrap-server.sh [options]"
      echo ""
      echo "Options:"
      echo "  --skip-discovery    Skip server discovery"
      echo "  --skip-security     Skip security hardening"
      echo "  --skip-docker       Skip Docker installation"
      echo "  --deploy-only       Only deploy Gateway (skip setup)"
      echo "  --audit-only        Only run security audit"
      echo "  --help              Show this help"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}Tech Citizen Gateway - Server Bootstrap${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

# 1. Check Ansible installed
if ! command -v ansible-playbook &> /dev/null; then
  echo -e "${RED}ERROR: Ansible not installed${NC}"
  echo "Install: sudo apt install ansible  # or  brew install ansible"
  exit 1
fi
echo -e "${GREEN}✓ Ansible installed${NC}"

# 2. Check secrets generated
if [ ! -f "ansible/secrets.env" ]; then
  echo -e "${RED}ERROR: Secrets not generated${NC}"
  echo ""
  echo "Run: bash scripts/generate-secrets.sh"
  exit 1
fi
echo -e "${GREEN}✓ Secrets file found${NC}"

# 3. Check inventory configured
if grep -q "HETZNER_IP_HERE" ansible/inventory/hosts.ini; then
  echo -e "${RED}ERROR: Inventory not configured${NC}"
  echo ""
  echo "Edit ansible/inventory/hosts.ini and replace:"
  echo "  - HETZNER_IP_HERE with your server IP"
  echo "  - your-domain.com with your domain"
  echo "  - CF_ZONE_ID_HERE with Cloudflare zone ID (if using Cloudflare)"
  exit 1
fi
echo -e "${GREEN}✓ Inventory configured${NC}"

# 4. Check SSH key
SSH_KEY="$HOME/.ssh/hetzner_techcitizen"
if [ ! -f "$SSH_KEY" ]; then
  echo -e "${RED}ERROR: SSH key not found: $SSH_KEY${NC}"
  echo ""
  echo "Generate SSH key:"
  echo "  ssh-keygen -t ed25519 -f $SSH_KEY -C 'gateway-deploy'"
  echo ""
  echo "Add public key to Hetzner server SSH keys"
  exit 1
fi
echo -e "${GREEN}✓ SSH key found${NC}"

# 5. Test SSH connection
SERVER_IP=$(grep "ansible_host=" ansible/inventory/hosts.ini | grep -v "#" | head -n1 | sed 's/.*ansible_host=//' | awk '{print $1}')
echo ""
echo -e "${YELLOW}Testing SSH connection to $SERVER_IP...${NC}"

if ssh -i "$SSH_KEY" -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@"$SERVER_IP" "echo 'SSH OK'" &> /dev/null; then
  echo -e "${GREEN}✓ SSH connection successful${NC}"
else
  echo -e "${RED}ERROR: Cannot connect to server${NC}"
  echo ""
  echo "Debug steps:"
  echo "  1. Check server IP: $SERVER_IP"
  echo "  2. Test manually: ssh -i $SSH_KEY root@$SERVER_IP"
  echo "  3. Verify SSH key added to server"
  exit 1
fi

echo ""
echo -e "${GREEN}All prerequisites met!${NC}"
echo ""

# Confirm deployment
DOMAIN=$(grep "domain=" ansible/inventory/hosts.ini | grep -v "#" | head -n1 | sed 's/.*domain=//' | awk '{print $1}')
echo -e "${YELLOW}Target server: root@${SERVER_IP}${NC}"
echo -e "${YELLOW}Domain: ${DOMAIN}${NC}"
echo ""

if [ "$AUDIT_ONLY" = true ]; then
  echo -e "${BLUE}Running security audit only...${NC}"
elif [ "$DEPLOY_ONLY" = true ]; then
  echo -e "${BLUE}Running deployment only (skipping server setup)...${NC}"
else
  echo -e "${BLUE}Full bootstrap will:${NC}"
  [ "$SKIP_DISCOVERY" = false ] && echo "  1. Discover server configuration"
  [ "$SKIP_SECURITY" = false ] && echo "  2. Harden security (firewall, SSH, fail2ban)"
  [ "$SKIP_DOCKER" = false ] && echo "  3. Install Docker + Docker Compose"
  echo "  4. Deploy Gateway + services"
  echo "  5. Configure monitoring"
fi
echo ""

read -p "Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Cancelled${NC}"
  exit 0
fi

echo ""
echo -e "${GREEN}Starting bootstrap...${NC}"
echo ""

# Build Ansible tags
TAGS="security,docker,deploy"
SKIP_TAGS=""

if [ "$SKIP_DISCOVERY" = true ]; then
  SKIP_TAGS="discovery"
fi

if [ "$SKIP_SECURITY" = true ]; then
  SKIP_TAGS="${SKIP_TAGS:+$SKIP_TAGS,}security"
fi

if [ "$SKIP_DOCKER" = true ]; then
  SKIP_TAGS="${SKIP_TAGS:+$SKIP_TAGS,}docker"
fi

if [ "$DEPLOY_ONLY" = true ]; then
  TAGS="deploy"
  SKIP_TAGS=""
fi

if [ "$AUDIT_ONLY" = true ]; then
  TAGS="audit"
  SKIP_TAGS=""
fi

# Run bootstrap playbook
ANSIBLE_CMD="ansible-playbook -i ansible/inventory/hosts.ini ansible/playbooks/bootstrap.yml --limit=production"

if [ -n "$TAGS" ]; then
  ANSIBLE_CMD="$ANSIBLE_CMD --tags=$TAGS"
fi

if [ -n "$SKIP_TAGS" ]; then
  ANSIBLE_CMD="$ANSIBLE_CMD --skip-tags=$SKIP_TAGS"
fi

echo -e "${BLUE}Running: $ANSIBLE_CMD${NC}"
echo ""

# Execute
if $ANSIBLE_CMD; then
  echo ""
  echo -e "${GREEN}======================================${NC}"
  echo -e "${GREEN}Bootstrap completed successfully!${NC}"
  echo -e "${GREEN}======================================${NC}"
  echo ""
  echo "Gateway URL: https://${DOMAIN}"
  echo "Metrics: https://${DOMAIN}/metrics"
  echo "Grafana: https://${DOMAIN}:3001"
  echo ""
  echo "Test health endpoint:"
  echo "  curl https://${DOMAIN}/health"
  echo ""
  echo "View logs on server:"
  echo "  ssh -i $SSH_KEY root@${SERVER_IP}"
  echo "  cd /opt/gateway && docker compose logs -f"
  echo ""
else
  echo ""
  echo -e "${RED}======================================${NC}"
  echo -e "${RED}Bootstrap failed!${NC}"
  echo -e "${RED}======================================${NC}"
  echo ""
  echo "Check Ansible output above for errors"
  echo ""
  echo "Debug on server:"
  echo "  ssh -i $SSH_KEY root@${SERVER_IP}"
  echo "  cat /var/log/gateway-bootstrap-*.log"
  echo ""
  exit 1
fi
