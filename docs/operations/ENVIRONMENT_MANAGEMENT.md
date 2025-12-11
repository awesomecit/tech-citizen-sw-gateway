# Environment Management

## Overview

Il progetto usa una strategia **multi-layer** per la gestione degli ambienti:

```
Root
├── .env.development          # Dev locale (default)
├── .env.test                 # Test (integration/e2e)
├── .env.staging              # Staging (simulazione Hetzner)
└── infrastructure/
    └── keycloak/
        ├── .env              # Keycloak dev (porta 8090)
        └── .env.test         # Keycloak test (porta 8091)
```

## Environment Loading Strategy

### 1. Docker Compose (Infrastructure)

Ogni `docker-compose.yml` carica automaticamente il file `.env` appropriato:

```yaml
# docker-compose.yml (development)
services:
  caddy:
    env_file:
      - .env.development  # ✅ Esplicito

# docker-compose.test.yml (override)
services:
  caddy:
    env_file:
      - .env.test  # ✅ Override per test
```

**Comando:**

```bash
# Development
docker compose up -d

# Test
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d
```

### 2. NPM Scripts (Application)

Gli script npm caricano le variabili tramite:

**A) Script bash wrapper:**

```bash
# scripts/test-with-keycloak.sh
export $(grep -v '^#' .env.test | xargs)
npm run test:integration
```

**B) NODE_ENV inline:**

```json
{
  "test:integration": "NODE_ENV=test jest --config ./jest.integration.config.cjs"
}
```

### 3. Platformatic Watt (Gateway)

Watt carica `.env` automaticamente dalla directory del servizio o root:

```bash
# Cerca in ordine:
# 1. services/gateway/.env
# 2. .env.development  ✅ (root)
```

## Environment Variables Reference

### Global Variables (Root)

Tutte le variabili condivise tra servizi:

| Variabile       | `.env.development`      | `.env.test`             | `.env.staging`         |
| --------------- | ----------------------- | ----------------------- | ---------------------- |
| `NODE_ENV`      | `development`           | `test`                  | `staging`              |
| `LOG_LEVEL`     | `info`                  | `error`                 | `info`                 |
| `KEYCLOAK_URL`  | `http://localhost:8090` | `http://localhost:8091` | `http://keycloak:8080` |
| `KEYCLOAK_PORT` | `8090`                  | `8091`                  | `8090`                 |
| `REDIS_PORT`    | `6380`                  | `6381`                  | `6379`                 |

### Infrastructure-Specific (keycloak)

Variabili specifiche per Keycloak:

| Variabile       | `.env` (dev) | `.env.test` |
| --------------- | ------------ | ----------- |
| `KEYCLOAK_PORT` | `8090`       | `8091`      |
| `REDIS_PORT`    | `6380`       | `6381`      |

## Port Allocation Matrix

| Service           | Development | Test  | Staging | Production |
| ----------------- | ----------- | ----- | ------- | ---------- |
| **Gateway**       | 3042        | 3043  | 3000    | 3000       |
| **Caddy HTTP**    | 18080       | 18080 | 8080    | 80         |
| **Caddy HTTPS**   | 18443       | 18443 | 8443    | 443        |
| **Keycloak**      | 8090        | 8091  | 8090    | 8080       |
| **Redis Session** | 6380        | 6381  | 6379    | 6379       |
| **Prometheus**    | 19090       | 19090 | 9090    | 9090       |
| **Grafana**       | 3000        | 3000  | 3001    | 3001       |

## Validation & Testing

### 1. Validate Environment Consistency

```bash
npm run env:validate
```

Verifica:

- ✅ Tutti i file `.env` hanno le stesse chiavi
- ✅ Porte non in conflitto
- ✅ Variabili obbligatorie presenti
- ✅ Nessun valore di produzione in dev/test

### 2. Test Full Stack

```bash
npm run test:stack
```

Esegue:

1. Avvia infrastructure (`docker-compose.test.yml`)
2. Carica variabili da `.env.test`
3. Esegue test di integrazione
4. Verifica health check di tutti i servizi
5. Cleanup automatico

### 3. Test Cross-Environment

```bash
npm run test:environments
```

Testa ogni ambiente in sequenza:

- Development → Test → Staging
- Verifica caricamento variabili
- Verifica override corretti

## Common Issues

### ❌ Problema: Porte in conflitto

**Sintomo:**

```
Error: Bind for 0.0.0.0:8091 failed: port is already allocated
```

**Soluzione:**

```bash
# Verifica container attivi
docker ps -a --filter "name=tech-citizen"

# Stoppa tutti
docker stop $(docker ps -q --filter "name=tech-citizen")

# Rimuovi
docker rm $(docker ps -aq --filter "name=tech-citizen")
```

### ❌ Problema: Variabili non caricate

**Sintomo:**

```javascript
process.env.KEYCLOAK_URL === undefined;
```

**Soluzione:**

```bash
# Verifica che NODE_ENV sia impostato
echo $NODE_ENV

# Carica manualmente .env.test
export $(grep -v '^#' .env.test | xargs)

# Verifica
echo $KEYCLOAK_URL
```

### ❌ Problema: File .env multipli in conflitto

**Sintomo:**
Keycloak usa porta 8090 invece di 8091 nei test.

**Causa:**
`infrastructure/keycloak/.env` sovrascrive `.env.test` del root.

**Soluzione:**

```bash
# Assicurati che docker-compose specifichi il file corretto
docker compose -f infrastructure/keycloak/docker-compose.keycloak-test.yml \
  --env-file infrastructure/keycloak/.env.test up -d
```

## Best Practices

### ✅ DO

- **Usa variabili d'ambiente** per TUTTO (porte, URL, segreti)
- **File `.env.example`** per documentare tutte le variabili
- **Override espliciti** nei docker-compose per ogni ambiente
- **Script bash wrapper** per caricare `.env` prima dei test
- **Validazione automatica** nei pre-commit hook

### ❌ DON'T

- ❌ Hardcodare porte o URL nel codice
- ❌ Committare file `.env` reali (solo `.env.example`)
- ❌ Riutilizzare le stesse porte tra dev/test
- ❌ Affidarsi al caricamento automatico di `.env` senza verificare

## Environment File Hierarchy

```
Priorità (dal più alto al più basso):

1. Variabili d'ambiente shell (export VAR=value)
2. --env-file esplicito in docker-compose
3. env_file nel docker-compose.yml
4. .env nella directory di lavoro
5. Default hardcoded nell'applicazione (da evitare!)
```

## Migration Checklist

Quando aggiungi una nuova variabile:

- [ ] Aggiungi a `.env.example` con placeholder
- [ ] Aggiungi a `.env.development` con valore dev
- [ ] Aggiungi a `.env.test` con valore test
- [ ] Aggiungi a `.env.staging` con valore staging
- [ ] Documenta in questo file (port matrix)
- [ ] Aggiungi validazione in `scripts/validate-env.sh`
- [ ] Testa con `npm run env:validate`

## Troubleshooting Commands

```bash
# Verifica quali variabili sono caricate
printenv | grep KEYCLOAK

# Verifica quale file .env viene usato
docker compose config | grep -A5 environment

# Test manuale del caricamento
source .env.test && echo $KEYCLOAK_URL

# Validazione completa
npm run env:validate && npm run test:stack
```

## See Also

- [Testing Documentation](../development/TESTING.md)
- [Docker Deployment](PRODUCTION_SETUP.md)
- [Infrastructure Setup](../infrastructure/INFRASTRUCTURE.md)
