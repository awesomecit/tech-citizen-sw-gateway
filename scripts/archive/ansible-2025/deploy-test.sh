#!/usr/bin/env bash
# Deploy Test Environment
# Usage: bash scripts/deploy-test.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 Deploying TEST environment to production server"
echo "=================================================="
echo ""

# Load secrets
if [[ ! -f ~/secrets/production.env ]]; then
  echo "❌ Error: ~/secrets/production.env not found"
  exit 1
fi

source ~/secrets/production.env

# Validate required variables
if [[ -z "${PRODUCTION_SERVER_IP:-}" ]]; then
  echo "❌ Error: PRODUCTION_SERVER_IP not set in ~/secrets/production.env"
  exit 1
fi

echo "✓ Secrets loaded"
echo "  Server: $PRODUCTION_SERVER_IP"
echo "  Environment: test"
echo ""

# Generate temporary inventory
INVENTORY_TMP="/tmp/ansible-inventory-test-$$.ini"
trap "rm -f $INVENTORY_TMP" EXIT

cat > "$INVENTORY_TMP" <<EOF
[test]
gateway-test ansible_host=$PRODUCTION_SERVER_IP ansible_user=root ansible_port=22

[test:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_private_key_file=~/.ssh/hetzner_techcitizen
EOF

echo "✓ Inventory generated: $INVENTORY_TMP"
echo ""

# Run deployment
echo "🚀 Starting deployment..."
echo ""

ansible-playbook \
  -i "$INVENTORY_TMP" \
  "$PROJECT_ROOT/ansible/playbooks/deploy-environment.yml" \
  --limit=test \
  -e "deploy_env=test" \
  "$@"

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  echo ""
  echo "✅ Test environment deployed successfully"
  echo ""
  echo "📋 Next steps:"
  echo "  1. Run tests: bash scripts/run-remote-tests.sh"
  echo "  2. Check logs: ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP 'docker logs gateway-test-caddy'"
  echo "  3. View containers: ssh -i ~/.ssh/hetzner_techcitizen root@$PRODUCTION_SERVER_IP 'docker ps | grep gateway-test'"
  echo "  4. Access Grafana: http://$PRODUCTION_SERVER_IP:3000"
else
  echo ""
  echo "❌ Deployment failed with exit code $EXIT_CODE"
  exit $EXIT_CODE
fi
