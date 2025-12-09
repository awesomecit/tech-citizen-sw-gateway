# Keycloak Test Environment

Ambiente dedicato ai **test automatizzati** (integration/e2e).

## Porte

| Servizio      | Porta | Descrizione                 |
| ------------- | ----- | --------------------------- |
| Keycloak      | 8091  | OIDC provider (test)        |
| Redis Session | 6381  | Session store (test)        |
| Gateway       | 3043  | API Gateway (test instance) |

## Differenze con Dev/Staging

- **Dev** (8090/6380/3042): Sviluppo locale, hot-reload
- **Test** (8091/6381/3043): Test automatizzati, CI/CD
- **Staging** (TBD): Automazioni, pre-produzione

## Avvio

```bash
# Start test infrastructure
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml up -d

# Verifico health
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml ps

# Logs
docker logs tech-citizen-keycloak-test --tail 50

# Stop
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml down
```

## Utenti Test

Realm: `healthcare-domain`

| Username                | Password    | Ruoli        |
| ----------------------- | ----------- | ------------ |
| test@healthcare.local   | Test1234!   | patient      |
| doctor@healthcare.local | Doctor1234! | doctor       |
| admin@healthcare.local  | Admin1234!  | system-admin |

## Test con cURL

```bash
# 1. Ottieni redirect URL
curl -sI http://localhost:3043/auth/login | grep Location

# 2. Login manuale (browser)
# Apri URL Keycloak → login → ottieni code dal callback

# 3. Test protected route (401 senza session)
curl -s http://localhost:3043/api/protected

# 4. Test con session cookie (dopo login via browser)
curl -s -b cookies.txt http://localhost:3043/api/protected
```

## Integrazione con Jest

```typescript
// test/setup/keycloak-test.ts
beforeAll(async () => {
  const keycloakReady = await fetch('http://localhost:8091/health/ready');
  expect(keycloakReady.ok).toBe(true);
});
```

## Cleanup

```bash
# Remove containers + volumes
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml down -v

# Remove network
docker network rm tech-citizen-test
```
