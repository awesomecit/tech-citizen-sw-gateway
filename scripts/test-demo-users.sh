#!/bin/bash
# Smoke Test: Demo Users Provisioning
# 
# Validates that demo users can be created in Keycloak
# Tests the ensure-demo-users.sh script

set -e

LOG_FILE="/tmp/demo-users-smoke-test.log"
TEST_RESULTS="/tmp/demo-users-test-results.txt"

echo "🧪 Demo Users Provisioning Test" | tee "$TEST_RESULTS"
echo "===============================" | tee -a "$TEST_RESULTS"

# Check Keycloak availability
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8090}"
echo "🔍 Checking Keycloak at $KEYCLOAK_URL..." | tee -a "$TEST_RESULTS"

if ! curl -sf "$KEYCLOAK_URL/health/ready" > /dev/null 2>&1; then
  echo "❌ Keycloak not available at $KEYCLOAK_URL" | tee -a "$TEST_RESULTS"
  echo "💡 Start Keycloak:" | tee -a "$TEST_RESULTS"
  echo "   docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml up -d" | tee -a "$TEST_RESULTS"
  exit 1
fi

echo "   ✅ Keycloak ready" | tee -a "$TEST_RESULTS"

# Run demo users script
echo "" | tee -a "$TEST_RESULTS"
echo "🔐 Creating demo users..." | tee -a "$TEST_RESULTS"

cd "$(dirname "$0")/.."
set +e  # Don't exit on non-zero, capture exit code
bash scripts/ensure-demo-users.sh dev > "$LOG_FILE" 2>&1
EXIT_CODE=$?
set -e  # Re-enable exit on error
if [ $EXIT_CODE -eq 0 ]; then
  echo "   ✅ Script executed successfully" | tee -a "$TEST_RESULTS"
elif [ $EXIT_CODE -eq 2 ]; then
  echo "   ⚠️  Keycloak admin-cli not configured for direct access" | tee -a "$TEST_RESULTS"
  echo "" | tee -a "$TEST_RESULTS"
  tail -6 "$LOG_FILE" | tee -a "$TEST_RESULTS"
  echo "" | tee -a "$TEST_RESULTS"
  echo "⏭️  Test skipped (requires manual Keycloak configuration)" | tee -a "$TEST_RESULTS"
  echo "📋 Full log: $LOG_FILE" | tee -a "$TEST_RESULTS"
  exit 0
else
  echo "   ❌ Script failed" | tee -a "$TEST_RESULTS"
  tail -20 "$LOG_FILE" | tee -a "$TEST_RESULTS"
  exit 1
fi

# Verify users exist
echo "" | tee -a "$TEST_RESULTS"
echo "🔍 Verifying users..." | tee -a "$TEST_RESULTS"

KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="${KEYCLOAK_REALM:-healthcare-domain}"

# Get admin token
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$KEYCLOAK_ADMIN" \
  -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli")

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token')

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "   ❌ Failed to get admin token" | tee -a "$TEST_RESULTS"
  exit 1
fi

# Check each demo user
DEMO_USERS=("demo-patient@healthcare.local" "demo-doctor@healthcare.local" "demo-admin@healthcare.local")
USERS_OK=0

for username in "${DEMO_USERS[@]}"; do
  USERS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  COUNT=$(echo "$USERS" | jq '. | length')
  
  if [ "$COUNT" -gt 0 ]; then
    echo "   ✅ $username exists" | tee -a "$TEST_RESULTS"
    USERS_OK=$((USERS_OK + 1))
  else
    echo "   ❌ $username NOT found" | tee -a "$TEST_RESULTS"
  fi
done

# Summary
echo "" | tee -a "$TEST_RESULTS"
echo "📊 Summary" | tee -a "$TEST_RESULTS"
echo "==========" | tee -a "$TEST_RESULTS"
echo "Users created: $USERS_OK / ${#DEMO_USERS[@]}" | tee -a "$TEST_RESULTS"

if [ $USERS_OK -eq ${#DEMO_USERS[@]} ]; then
  echo "   ✅ All demo users provisioned correctly" | tee -a "$TEST_RESULTS"
  echo "" | tee -a "$TEST_RESULTS"
  echo "Test login at: $KEYCLOAK_URL/realms/$REALM/account" | tee -a "$TEST_RESULTS"
  echo "📋 Full log: $LOG_FILE" | tee -a "$TEST_RESULTS"
  echo "📊 Results: $TEST_RESULTS" | tee -a "$TEST_RESULTS"
  exit 0
else
  echo "   ❌ Some users missing" | tee -a "$TEST_RESULTS"
  echo "📋 Check log: $LOG_FILE" | tee -a "$TEST_RESULTS"
  exit 1
fi
