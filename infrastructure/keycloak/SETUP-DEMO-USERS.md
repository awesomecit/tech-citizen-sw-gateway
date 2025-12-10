# Keycloak Setup for Demo Users

## Quick Start (One-time Configuration)

The demo users auto-provisioning requires Keycloak's `admin-cli` client to have Direct Access Grants enabled.

### Option 1: Automated (Docker)

```bash
npm run staging:configure-keycloak
```

**Note**: This requires the Keycloak container to be running and accessible via Docker.

### Option 2: Manual (Web UI)

1. Open Keycloak Admin Console: http://localhost:8090
2. Login with admin credentials (default: `admin` / `admin`)
3. Navigate to: **Clients** → **admin-cli**
4. Go to **Settings** tab
5. Scroll to **Capability config** section
6. Toggle **Direct access grants** to **ON**
7. Click **Save**

### Option 3: Docker Exec (Command Line)

```bash
# Find Keycloak container ID
CONTAINER=$(docker ps --filter "name=keycloak" --format "{{.ID}}" | head -1)

# Access container shell
docker exec -it $CONTAINER bash

# Inside container, use kcadm.sh
cd /opt/keycloak/bin

# This requires admin-cli to already have direct access grants enabled (chicken-egg problem)
# So manual configuration is usually needed first
```

## Verify Configuration

After enabling Direct Access Grants, test with:

```bash
npm run test:smoke:demo-users
```

Expected output:

```
✅ Script executed successfully
✅ demo-patient@healthcare.local exists
✅ demo-doctor@healthcare.local exists
✅ demo-admin@healthcare.local exists
```

## Troubleshooting

### Error: "Failed to get admin token"

This means Direct Access Grants is still disabled on admin-cli client.

**Solution**: Use Manual configuration (Option 2) above.

### Error: "Keycloak not available"

**Solution**: Start Keycloak:

```bash
docker compose -f infrastructure/keycloak/docker-compose.keycloak.yml up -d
```

Wait ~30s for startup, then retry.

## Why Is This Needed?

Keycloak 23+ ships with `admin-cli` client having Direct Access Grants **disabled** by default for security.

Demo user provisioning uses Resource Owner Password Credentials grant (username + password → token), which requires this setting enabled.

This is safe for **local development** but should **NOT** be used in production with real credentials.

## Production Alternative

For production, use:

- Service accounts with client credentials grant
- Keycloak User Federation (LDAP, AD)
- External identity provider (Entra ID, Okta)
- Terraform/Ansible with Keycloak provider
