# Environment Configuration Guide

## Panoramica

Il progetto supporta configurazioni separate per ogni ambiente tramite file `.env` dedicati e override Docker Compose.

## File Environment

### `.env.development` (default)

Configurazione per sviluppo locale. Caricato automaticamente da Docker Compose tramite `env_file`.

```bash
NODE_ENV=development
LOG_LEVEL=debug
CADDY_HTTP_PORT=18080
CADDY_HTTPS_PORT=18443
PROMETHEUS_PORT=19090
GRAFANA_PORT=3000
```

### `.env.test`

Configurazione per test automatizzati. Usato da `docker-compose.test.yml` e script di test.

```bash
NODE_ENV=test
LOG_LEVEL=error
DATABASE_NAME=gateway_test
```

### `.env.example`

Template per creare nuovi file environment. **NON committare** file `.env.*` con credenziali reali.

## Docker Compose per Environment

### Development (default)

```bash
# Avvio manuale
docker compose up -d

# Con script helper
npm run infra:start
# oppure
./scripts/infra-start.sh development
```

Usa `docker-compose.yml` con `env_file: .env.development`.

### Test

```bash
# Avvio manuale
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d

# Con script helper
npm run infra:start:test
# oppure
./scripts/infra-start.sh test
```

Usa override `docker-compose.test.yml` che carica `.env.test`.

### Production

Crea `.env.production` e `docker-compose.production.yml` quando necessario.

## Test Integration con Environment Corretto

### Esecuzione Test

```bash
# Test integration (carica automaticamente .env.test)
npm run test:integration

# Con safety guard (verifica NODE_ENV, database, ecc.)
npm run test:integration:safe
```

Il file `test/infrastructure.test.ts` carica `.env.test` tramite:

```typescript
import { config } from 'dotenv';
config({ path: '.env.test' });
```

### Safety Guards

Lo script `scripts/test-env-guard.sh` verifica:

- ✅ `NODE_ENV=test`
- ✅ Database name contiene "test" (no "prod", "production")
- ✅ Database host non è production
- ✅ File `.env.test` esiste

Previene esecuzione accidentale contro ambienti production.

## Gestione Infrastruttura

### Start/Stop Scripts

```bash
# Development
npm run infra:start          # Avvia con .env.development
npm run infra:stop           # Ferma senza rimuovere volumi
npm run infra:clean          # Ferma e rimuove volumi

# Test
npm run infra:start:test     # Avvia con .env.test
npm run infra:stop:test      # Ferma test environment

# Manuale con parametri
./scripts/infra-start.sh [development|test|production]
./scripts/infra-stop.sh [development|test|production] [volumes]
```

### Override Pattern

Docker Compose supporta merge di più file:

```yaml
# docker-compose.yml (base)
services:
  caddy:
    env_file:
      - .env.development  # Default
    ports:
      - '${CADDY_HTTP_PORT:-18080}:8080'

# docker-compose.test.yml (override)
services:
  caddy:
    env_file:
      - .env.test  # Sovrascrive .env.development
    environment:
      - NODE_ENV=test
```

## Variabili d'Ambiente nei Container

### Caricamento Automatico

Docker Compose carica variabili in questo ordine (priorità decrescente):

1. `environment:` nel service (massima priorità)
2. `env_file:` specificato nel service
3. `.env` file nella root (se esiste)
4. Variabili shell dell'host

### Esempio Completo

```yaml
services:
  grafana:
    env_file:
      - .env.development # Carica tutte le variabili
    environment:
      # Sovrascrive con valori specifici o interpolati
      - GF_SECURITY_ADMIN_USER=${GF_SECURITY_ADMIN_USER:-admin}
      - GF_SECURITY_ADMIN_PASSWORD=${GF_SECURITY_ADMIN_PASSWORD:-admin}
    ports:
      - '${GRAFANA_PORT:-3000}:3000' # Usa variabile da env_file
```

## Best Practices

### ✅ Do

- Usa file `.env.*` per ogni environment
- Commita `.env.example` come template
- Aggiungi `.env.*` a `.gitignore` (già fatto)
- Usa `${VAR:-default}` per valori con fallback
- Testa con `npm run test:integration:safe` per verifiche automatiche
- Documenta nuove variabili in questo file

### ❌ Don't

- Non committare `.env.development`, `.env.test`, `.env.production` con credenziali
- Non usare `latest` tag per immagini Docker (specifica versioni)
- Non hardcodare valori in `docker-compose.yml` (usa variabili)
- Non eseguire test contro database production

## Troubleshooting

### I container non caricano .env.test

**Problema**: Hai avviato con `docker compose up -d` invece di `docker compose -f docker-compose.yml -f docker-compose.test.yml up -d`.

**Soluzione**: Usa script helper `npm run infra:start:test` o specifica entrambi i file compose.

### Test falliscono con "wrong environment"

**Problema**: Container avviati con .env.development invece di .env.test.

**Soluzione**:

```bash
npm run infra:stop
npm run infra:start:test
npm run test:integration
```

### Variabile non interpolata in docker-compose.yml

**Problema**: Hai usato `${VAR}` ma Docker Compose non la sostituisce.

**Soluzione**: Assicurati che:

1. La variabile sia definita in `.env.development` o `.env.test`
2. Il service abbia `env_file:` che punta al file corretto
3. Usa `${VAR:-default}` per fornire un fallback

## Riferimenti

- [Docker Compose env_file](https://docs.docker.com/compose/environment-variables/set-environment-variables/)
- [Docker Compose override](https://docs.docker.com/compose/multiple-compose-files/merge/)
- [dotenv NPM package](https://www.npmjs.com/package/dotenv)
- Vedi `docs/IAC_TESTING.md` per strategia di testing multi-ambiente
