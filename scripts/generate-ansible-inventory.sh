#!/bin/bash
# Generate Ansible inventory from environment variables
# Usage: bash scripts/generate-ansible-inventory.sh

set -euo pipefail

INVENTORY_TEMPLATE="ansible/inventory/hosts.ini"
INVENTORY_TMP="/tmp/ansible-inventory-$$.ini"

# Check required environment variables
if [ -z "${PRODUCTION_SERVER_IP:-}" ]; then
  echo "❌ Error: PRODUCTION_SERVER_IP not set"
  echo "   Run: source ~/secrets/production.env"
  exit 1
fi

echo "✓ Generating Ansible inventory from environment..."
echo "  Server IP: $PRODUCTION_SERVER_IP"

# Replace REPLACE_WITH_IP with actual IP
sed "s/REPLACE_WITH_IP/$PRODUCTION_SERVER_IP/g" "$INVENTORY_TEMPLATE" > "$INVENTORY_TMP"

echo "✓ Inventory generated: $INVENTORY_TMP"
echo
echo "Usage:"
echo "  ansible-playbook -i $INVENTORY_TMP playbooks/bootstrap.yml --limit=production"
echo
echo "OR use ansible.sh wrapper:"
echo "  bash scripts/ansible.sh bootstrap"
