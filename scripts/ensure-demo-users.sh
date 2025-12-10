#!/bin/bash
# Ensure Demo Users in Keycloak (Staging Environment)
# 
# Creates default demo users if they don't exist:
# - demo-patient@healthcare.local (patient role)
# - demo-doctor@healthcare.local (doctor role)
# - demo-admin@healthcare.local (system-admin role)
#
# Usage: ./scripts/ensure-demo-users.sh [staging|dev]

set -e

ENV="${1:-staging}"
KEYCLOAK_URL="${KEYCLOAK_URL:-http://localhost:8090}"
KEYCLOAK_ADMIN="${KEYCLOAK_ADMIN:-admin}"
KEYCLOAK_ADMIN_PASSWORD="${KEYCLOAK_ADMIN_PASSWORD:-admin}"
REALM="${KEYCLOAK_REALM:-healthcare-domain}"

LOG_FILE="/tmp/keycloak-demo-users-${ENV}.log"

echo "🔐 Keycloak Demo Users Setup (${ENV})" | tee "$LOG_FILE"
echo "======================================" | tee -a "$LOG_FILE"
echo "Keycloak: $KEYCLOAK_URL" | tee -a "$LOG_FILE"
echo "Realm: $REALM" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

# Get admin token
echo "🔑 Getting admin token..." | tee -a "$LOG_FILE"
TOKEN_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/realms/master/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=$KEYCLOAK_ADMIN" \
  -d "password=$KEYCLOAK_ADMIN_PASSWORD" \
  -d "grant_type=password" \
  -d "client_id=admin-cli" 2>&1)

ACCESS_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.access_token' 2>/dev/null || echo "null")

if [ "$ACCESS_TOKEN" = "null" ] || [ -z "$ACCESS_TOKEN" ]; then
  echo "❌ Failed to get admin token" | tee -a "$LOG_FILE"
  echo "Response: $TOKEN_RESPONSE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "   ✅ Token obtained" | tee -a "$LOG_FILE"

# Function to check if user exists
user_exists() {
  local username=$1
  USERS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" \
    -H "Authorization: Bearer $ACCESS_TOKEN")
  
  COUNT=$(echo "$USERS" | jq '. | length')
  [ "$COUNT" -gt 0 ]
}

# Function to create user
create_user() {
  local username=$1
  local email=$2
  local first_name=$3
  local last_name=$4
  local password=$5
  local role=$6
  
  echo "👤 Creating user: $username" | tee -a "$LOG_FILE"
  
  # Create user
  USER_DATA=$(cat <<EOF
{
  "username": "$username",
  "email": "$email",
  "firstName": "$first_name",
  "lastName": "$last_name",
  "enabled": true,
  "emailVerified": true,
  "credentials": [{
    "type": "password",
    "value": "$password",
    "temporary": false
  }]
}
EOF
)
  
  CREATE_RESPONSE=$(curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users" \
    -H "Authorization: Bearer $ACCESS_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$USER_DATA" \
    -w "\n%{http_code}")
  
  HTTP_CODE=$(echo "$CREATE_RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "201" ]; then
    echo "   ✅ User created" | tee -a "$LOG_FILE"
    
    # Get user ID
    USERS=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/users?username=$username&exact=true" \
      -H "Authorization: Bearer $ACCESS_TOKEN")
    USER_ID=$(echo "$USERS" | jq -r '.[0].id')
    
    # Assign role
    if [ -n "$role" ] && [ "$role" != "null" ]; then
      echo "   🎭 Assigning role: $role" | tee -a "$LOG_FILE"
      
      # Get role ID
      ROLE_DATA=$(curl -s -X GET "$KEYCLOAK_URL/admin/realms/$REALM/roles/$role" \
        -H "Authorization: Bearer $ACCESS_TOKEN")
      ROLE_ID=$(echo "$ROLE_DATA" | jq -r '.id')
      
      if [ "$ROLE_ID" != "null" ] && [ -n "$ROLE_ID" ]; then
        # Assign role to user
        ROLE_MAPPING=$(cat <<EOF
[{
  "id": "$ROLE_ID",
  "name": "$role"
}]
EOF
)
        
        curl -s -X POST "$KEYCLOAK_URL/admin/realms/$REALM/users/$USER_ID/role-mappings/realm" \
          -H "Authorization: Bearer $ACCESS_TOKEN" \
          -H "Content-Type: application/json" \
          -d "$ROLE_MAPPING" > /dev/null
        
        echo "      ✅ Role assigned" | tee -a "$LOG_FILE"
      else
        echo "      ⚠️  Role not found: $role" | tee -a "$LOG_FILE"
      fi
    fi
  else
    echo "   ❌ Failed to create user (HTTP $HTTP_CODE)" | tee -a "$LOG_FILE"
    echo "   Response: $(echo "$CREATE_RESPONSE" | head -n -1)" | tee -a "$LOG_FILE"
  fi
}

# Demo users configuration
declare -A DEMO_USERS=(
  ["demo-patient@healthcare.local"]="Demo:Patient:DemoPatient123!:patient"
  ["demo-doctor@healthcare.local"]="Demo:Doctor:DemoDoctor123!:doctor"
  ["demo-admin@healthcare.local"]="Demo:Admin:DemoAdmin123!:system-admin"
)

# Check and create users
echo "🔍 Checking demo users..." | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"

for username in "${!DEMO_USERS[@]}"; do
  IFS=':' read -r first_name last_name password role <<< "${DEMO_USERS[$username]}"
  
  if user_exists "$username"; then
    echo "✅ User exists: $username" | tee -a "$LOG_FILE"
  else
    echo "➕ User missing: $username" | tee -a "$LOG_FILE"
    create_user "$username" "$username" "$first_name" "$last_name" "$password" "$role"
  fi
  echo "" | tee -a "$LOG_FILE"
done

# Summary
echo "📊 Summary" | tee -a "$LOG_FILE"
echo "==========" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Demo credentials (${ENV}):" | tee -a "$LOG_FILE"
echo "  • demo-patient@healthcare.local / DemoPatient123! (patient)" | tee -a "$LOG_FILE"
echo "  • demo-doctor@healthcare.local  / DemoDoctor123!  (doctor)" | tee -a "$LOG_FILE"
echo "  • demo-admin@healthcare.local   / DemoAdmin123!   (system-admin)" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "Test login: $KEYCLOAK_URL/realms/$REALM/account" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
echo "✅ Demo users setup completed!" | tee -a "$LOG_FILE"
echo "📋 Log: $LOG_FILE" | tee -a "$LOG_FILE"
