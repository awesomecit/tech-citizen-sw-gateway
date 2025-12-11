#!/bin/bash
# Ansible Production Deployment Script
# Automatically loads secrets and generates dynamic inventory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SECRETS_FILE="$HOME/secrets/production.env"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check secrets file exists
if [ ! -f "$SECRETS_FILE" ]; then
  echo -e "${RED}❌ Secrets file not found: $SECRETS_FILE${NC}"
  echo
  echo "Create it from template:"
  echo "  cp $PROJECT_ROOT/ansible/production.env.example $SECRETS_FILE"
  echo "  nano $SECRETS_FILE  # Fill with real values"
  echo "  chmod 600 $SECRETS_FILE"
  exit 1
fi

# Load secrets
echo -e "${GREEN}✓ Loading secrets from $SECRETS_FILE${NC}"
source "$SECRETS_FILE"

# Validate required variables
if [ -z "${PRODUCTION_SERVER_IP:-}" ]; then
  echo -e "${RED}❌ PRODUCTION_SERVER_IP not set in $SECRETS_FILE${NC}"
  exit 1
fi

# Generate dynamic inventory
INVENTORY_TMP="/tmp/ansible-inventory-production-$$.ini"
sed "s/REPLACE_WITH_IP/$PRODUCTION_SERVER_IP/g" \
  "$PROJECT_ROOT/ansible/inventory/hosts.ini" > "$INVENTORY_TMP"

echo -e "${GREEN}✓ Inventory generated: $INVENTORY_TMP${NC}"
echo

# Parse command
ACTION="${1:-help}"

case "$ACTION" in
  help|--help|-h)
    echo "Usage: bash scripts/ansible-production.sh <action>"
    echo
    echo "Actions:"
    echo "  bootstrap     - Full server setup (security + docker + gateway)"
    echo "  security      - Security hardening only"
    echo "  docker        - Install Docker only"
    echo "  deploy        - Deploy Gateway only"
    echo "  caddy         - Configure Caddy reverse proxy"
    echo "  ping          - Test Ansible connectivity"
    echo "  audit         - Security audit"
    echo
    echo "Examples:"
    echo "  bash scripts/ansible-production.sh bootstrap"
    echo "  bash scripts/ansible-production.sh caddy"
    echo
    exit 0
    ;;
    
  ping)
    ansible -i "$INVENTORY_TMP" production -m ping
    ;;
    
  bootstrap)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/bootstrap.yml" \
      --limit=production \
      -e "domain=$DOMAIN" \
      -e "ssl_email=${SSL_EMAIL:-admin@$DOMAIN}"
    ;;
    
  security)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/bootstrap.yml" \
      --limit=production \
      --tags=security
    ;;
    
  docker)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/bootstrap.yml" \
      --limit=production \
      --tags=docker
    ;;
    
  deploy)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/bootstrap.yml" \
      --limit=production \
      --tags=deploy
    ;;
    
  caddy)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/setup-caddy.yml" \
      --limit=production
    ;;
    
  audit)
    ansible-playbook -i "$INVENTORY_TMP" \
      "$PROJECT_ROOT/ansible/playbooks/security-audit.yml" \
      --limit=production
    ;;
    
  *)
    echo -e "${RED}❌ Unknown action: $ACTION${NC}"
    echo "Run: bash scripts/ansible-production.sh help"
    exit 1
    ;;
esac

# Cleanup temp inventory
rm -f "$INVENTORY_TMP"
