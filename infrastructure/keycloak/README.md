# Keycloak Development Environment

## Quick Start

```bash
# Start Keycloak + Redis
cd infrastructure/keycloak
docker compose -f docker-compose.keycloak.yml up -d

# Check health
docker compose -f docker-compose.keycloak.yml ps
curl http://localhost:8080/health/ready

# View logs
docker compose -f docker-compose.keycloak.yml logs -f keycloak
```

## Access URLs

- **Keycloak Admin Console**: http://localhost:8090/admin
  - Username: `admin`
  - Password: `admin`

- **Realm**: `healthcare-domain`
  - OIDC Discovery: http://localhost:8090/realms/healthcare-domain/.well-known/openid-configuration

> **Note**: Default port is **8090** (not 8080) to avoid conflicts. Override with `KEYCLOAK_PORT` env var.

## Test Users

| Email                     | Password      | Role                                   | Group             | Use Case                    |
| ------------------------- | ------------- | -------------------------------------- | ----------------- | --------------------------- |
| `test@healthcare.local`   | `Test1234!`   | `user`, `patient`                      | `/patients`       | Basic E2E tests             |
| `doctor@healthcare.local` | `Doctor1234!` | `doctor`, `user`                       | `/doctors`        | RBAC tests (medical access) |
| `admin@healthcare.local`  | `Admin1234!`  | `system-admin`, `domain-admin`, `user` | `/administrators` | Admin flows                 |

## Client Configuration

**Client ID**: `gateway-client`  
**Client Secret**: `gateway-client-secret-change-in-production` ⚠️ **CHANGE IN PRODUCTION!**

**Redirect URIs**:

- `http://localhost:3000/auth/callback` (gateway dev)
- `http://localhost:3001/auth/callback` (alternative port)
- `https://staging.healthcare.local/auth/callback` (staging)

**PKCE**: S256 (SHA-256) - **REQUIRED**

## Environment Variables for Gateway

```bash
# .env.development
KEYCLOAK_URL=http://localhost:8080
KEYCLOAK_REALM=healthcare-domain
KEYCLOAK_CLIENT_ID=gateway-client
KEYCLOAK_CLIENT_SECRET=gateway-client-secret-change-in-production
KEYCLOAK_CALLBACK_URL=http://localhost:3000/auth/callback

# Redis session
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=dev-redis-password
SESSION_SECRET=change-me-in-production-min-32-chars
SESSION_TTL=3600
```

## Roles & Permissions (RBAC)

### Realm Roles

- **`system-admin`**: Full system access (infrastructure, configuration)
- **`domain-admin`**: Healthcare organization administrator
- **`doctor`**: Medical professional with patient record access
- **`nurse`**: Nursing staff with limited patient access
- **`patient`**: Self-service patient portal access
- **`user`**: Basic authenticated user (all users have this)

### Groups

Groups automatically assign realm roles:

- **`/administrators`** → `system-admin`, `domain-admin`, `user`
- **`/doctors`** → `doctor`, `user`
- **`/nurses`** → `nurse`, `user`
- **`/patients`** → `patient`, `user`

## Token Lifespans

- **Access Token**: 5 minutes (300s)
- **Refresh Token**: No max reuse
- **SSO Session Idle**: 30 minutes (1800s)
- **SSO Session Max**: 10 hours (36000s)

## Security Features

- ✅ PKCE S256 enforcement
- ✅ Brute force protection (30 attempts → 15 min lockout)
- ✅ Remember Me enabled
- ✅ Password reset allowed
- ✅ Event logging enabled (login, logout, errors)
- ✅ Admin event auditing

## Healthchecks

```bash
# Keycloak ready
curl http://localhost:8080/health/ready

# Metrics (Prometheus format)
curl http://localhost:8080/metrics

# Redis
docker exec tech-citizen-redis-session redis-cli --raw incr ping
```

## Cleanup

```bash
# Stop containers
docker compose -f docker-compose.keycloak.yml down

# Remove volumes (WIPES ALL DATA!)
docker compose -f docker-compose.keycloak.yml down -v
```

## Production Considerations

⚠️ **DO NOT USE THIS CONFIG IN PRODUCTION!**

Required changes:

1. **Database**: Replace H2 with PostgreSQL
2. **Secrets**: Generate new client secret via `npm run keys:keycloak`
3. **HTTPS**: Enable TLS with valid certificates
4. **Hostname**: Set `KC_HOSTNAME` to production domain
5. **Admin Password**: Change from `admin/admin`
6. **Redis Password**: Use strong password from `npm run keys:session`
7. **Session Secret**: Generate via `npm run keys:session`

## Troubleshooting

### Keycloak won't start

```bash
# Check logs
docker logs tech-citizen-keycloak

# Common issues:
# - Port 8080 already in use: change port mapping
# - Realm import failed: validate realm-export.json syntax
```

### Cannot login to admin console

- Default credentials: `admin` / `admin`
- Reset: stop container, remove volume, restart

### Gateway cannot connect

- Verify network: `docker network inspect keycloak_tech-citizen-network`
- Check firewall: `sudo ufw status`
- Test discovery: `curl http://localhost:8080/realms/healthcare-domain/.well-known/openid-configuration`

## References

- [Keycloak Server Administration Guide](https://www.keycloak.org/docs/latest/server_admin/)
- [OIDC Discovery Spec](https://openid.net/specs/openid-connect-discovery-1_0.html)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)
- [ADR-003: User Management Architecture](../../docs/architecture/decisions/ADR-003-user-management-architecture.md)
