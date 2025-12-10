# Keycloak Admin Automation

## Overview

This project uses a dedicated **admin-automation** client in Keycloak for automated admin operations (user provisioning, realm management) instead of relying on the default `admin-cli` client.

## Why a Custom Admin Client?

Starting with Keycloak 23+, the default `admin-cli` client has **Direct Access Grants disabled** by default for security reasons. Instead of manually enabling it (which resets on realm re-import), we use a dedicated client.

## Configuration

The `admin-automation` client is automatically created when importing the realm:

**Client Details:**

- **Client ID**: `admin-automation`
- **Client Secret**: `admin-automation-secret-change-in-production` (⚠️ **CHANGE IN PRODUCTION**)
- **Grant Types**: Client Credentials, Resource Owner Password
- **Direct Access Grants**: ✅ Enabled
- **Service Accounts**: ✅ Enabled

## Usage in Scripts

Scripts automatically use `admin-automation` client:

```bash
# Environment variables (optional, defaults provided)
export ADMIN_CLIENT_ID="admin-automation"
export ADMIN_CLIENT_SECRET="admin-automation-secret-change-in-production"

# Run demo users script
npm run staging:demo-users
```

### Authentication Methods

**1. Client Credentials (Recommended for automation):**

```bash
TOKEN=$(curl -s -X POST "http://localhost:8090/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-automation" \
  -d "client_secret=admin-automation-secret-change-in-production" \
  -d "grant_type=client_credentials" | jq -r '.access_token')
```

**2. Password Grant (Fallback):**

```bash
TOKEN=$(curl -s -X POST "http://localhost:8090/realms/master/protocol/openid-connect/token" \
  -d "client_id=admin-automation" \
  -d "client_secret=admin-automation-secret-change-in-production" \
  -d "username=admin" \
  -d "password=admin" \
  -d "grant_type=password" | jq -r '.access_token')
```

## Fallback to admin-cli

If `admin-automation` is not available (older realm exports), scripts automatically fallback to `admin-cli`. To enable it manually:

1. Open Keycloak Admin Console
2. Navigate to: **master realm → Clients → admin-cli**
3. Settings tab → **Direct access grants**: ON
4. Click **Save**

⚠️ Note: This setting resets when re-importing the realm.

## Security Best Practices

### Development

```bash
# .env.development
ADMIN_CLIENT_ID=admin-automation
ADMIN_CLIENT_SECRET=admin-automation-secret-change-in-production
```

### Production

```bash
# .env.production
ADMIN_CLIENT_ID=admin-automation
ADMIN_CLIENT_SECRET=<STRONG_RANDOM_SECRET_HERE>  # Generate with: openssl rand -base64 32
```

**Rotate secrets regularly:**

```bash
# Generate new secret
NEW_SECRET=$(openssl rand -base64 32)

# Update in Keycloak UI or via API
curl -X PUT "https://keycloak.production/admin/realms/master/clients/{client-uuid}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"secret\": \"$NEW_SECRET\"}"
```

## Troubleshooting

### Error: "Failed to get admin token"

**Cause**: `admin-automation` client not found in realm.

**Solution**:

1. Re-import realm: `docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml down -v`
2. Start fresh: `docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml up -d`
3. Verify: `curl http://localhost:8090/admin/realms/healthcare-domain/clients | jq '.[] | select(.clientId=="admin-automation")'`

### Error: "unauthorized_client"

**Cause**: Client secret mismatch.

**Solution**:

1. Check secret in `.env` matches Keycloak
2. Verify client exists: Keycloak Admin → healthcare-domain → Clients → admin-automation
3. Check secret: Credentials tab

### Scripts skip with "admin-cli not configured"

**Expected behavior** if using old realm export without `admin-automation` client.

**Solution**: Update `realm-export.json` from latest version or enable admin-cli manually (one-time).

## References

- [Keycloak Admin REST API](https://www.keycloak.org/docs-api/23.0/rest-api/index.html)
- [Client Credentials Grant](https://www.keycloak.org/docs/latest/server_admin/#_client_credentials_grant)
- [Service Accounts](https://www.keycloak.org/docs/latest/server_admin/#_service_accounts)
