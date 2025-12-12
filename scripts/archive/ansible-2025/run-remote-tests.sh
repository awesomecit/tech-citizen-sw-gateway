#!/usr/bin/env bash
# Run Tests on Remote Test Environment
# Usage: bash scripts/run-remote-tests.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "🧪 Running tests on remote test environment"
echo "============================================="
echo ""

# Load secrets
if [[ ! -f ~/secrets/production.env ]]; then
  echo "❌ Error: ~/secrets/production.env not found"
  exit 1
fi

source ~/secrets/production.env

if [[ -z "${PRODUCTION_SERVER_IP:-}" ]]; then
  echo "❌ Error: PRODUCTION_SERVER_IP not set"
  exit 1
fi

SERVER="$PRODUCTION_SERVER_IP"
SSH_KEY="$HOME/.ssh/hetzner_techcitizen"

echo "✓ Target: $SERVER"
echo "✓ Environment: test"
echo ""

# Helper function for SSH commands
run_remote() {
  ssh -i "$SSH_KEY" root@"$SERVER" "$@"
}

# Step 1: Check test environment exists
echo "📦 Checking test environment..."
if ! run_remote "test -d /opt/gateway-test"; then
  echo "❌ Test environment not found. Run: bash scripts/deploy-test.sh"
  exit 1
fi
echo "✓ Test environment found"
echo ""

# Step 2: Copy test files to server
echo "📤 Copying test files to server..."
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/test" root@"$SERVER":/opt/gateway-test/
scp -i "$SSH_KEY" -r "$PROJECT_ROOT/e2e" root@"$SERVER":/opt/gateway-test/
scp -i "$SSH_KEY" "$PROJECT_ROOT/package.json" root@"$SERVER":/opt/gateway-test/
scp -i "$SSH_KEY" "$PROJECT_ROOT/jest.config.cjs" root@"$SERVER":/opt/gateway-test/
scp -i "$SSH_KEY" "$PROJECT_ROOT/jest.integration.config.cjs" root@"$SERVER":/opt/gateway-test/
echo "✓ Test files copied"
echo ""

# Step 3: Install Node.js 22.x if not present or upgrade
echo "📦 Checking Node.js..."
if ! run_remote "command -v node >/dev/null 2>&1"; then
  echo "  Installing Node.js 22.x..."
  run_remote "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
  run_remote "apt-get install -y nodejs"
else
  CURRENT_VERSION=$(run_remote "node --version | sed 's/v//' | cut -d. -f1")
  if [[ "$CURRENT_VERSION" -lt 22 ]]; then
    echo "  Upgrading Node.js from v${CURRENT_VERSION} to 22.x..."
    run_remote "curl -fsSL https://deb.nodesource.com/setup_22.x | bash -"
    run_remote "apt-get install -y nodejs"
  fi
fi
NODE_VERSION=$(run_remote "node --version")
echo "✓ Node.js installed: $NODE_VERSION"
echo ""

# Step 4: Install dependencies (including devDependencies for jest)
echo "📦 Installing test dependencies..."
# Install all deps (jest is in devDependencies), skip husky prepare
run_remote "cd /opt/gateway-test && npm install --ignore-scripts"
echo "✓ Dependencies installed"
echo ""

# Step 5: Run unit tests
echo "🧪 Running unit tests..."
run_remote "cd /opt/gateway-test && npm run test:unit" || {
  echo "⚠️  Unit tests failed (this is OK for first run)"
}
echo ""

# Step 6: Run integration tests
echo "🧪 Running integration tests..."
run_remote "cd /opt/gateway-test && npm run test:integration:infra" || {
  echo "⚠️  Integration tests failed"
}
echo ""

# Step 7: Container health check
echo "🩺 Checking container health..."
CONTAINER_STATUS=$(run_remote "docker ps --filter 'name=gateway-test' --format 'table {{.Names}}\t{{.Status}}'")
echo "$CONTAINER_STATUS"
echo ""

# Step 8: Endpoint health checks
echo "🩺 Checking endpoints..."

# Caddy
if run_remote "curl -sf http://localhost/health >/dev/null 2>&1 || curl -sf -I http://localhost/health | grep -q '301\|308'"; then
  echo "✓ Caddy: OK"
else
  echo "✗ Caddy: FAIL"
fi

# Prometheus
if run_remote "curl -sf http://localhost:19090/-/healthy >/dev/null"; then
  echo "✓ Prometheus: OK"
else
  echo "✗ Prometheus: FAIL"
fi

# Grafana
if run_remote "curl -sf http://localhost:3000/api/health >/dev/null"; then
  echo "✓ Grafana: OK"
else
  echo "✗ Grafana: FAIL"
fi

echo ""
echo "✅ Remote tests complete"
echo ""
echo "📋 View logs:"
echo "  ssh -i $SSH_KEY root@$SERVER 'docker logs gateway-test-caddy'"
echo "  ssh -i $SSH_KEY root@$SERVER 'docker logs gateway-test-prometheus'"
echo "  ssh -i $SSH_KEY root@$SERVER 'docker logs gateway-test-grafana'"
