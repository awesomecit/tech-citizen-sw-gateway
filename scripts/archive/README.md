# Archived Scripts

Questi script sono stati archiviati perché non più utilizzati o sostituiti da soluzioni migliori.

## Script Archiviati

### Developer Experience (sostituiti da workflow standard)

- `end-of-day-debrief.sh` - Generava debrief giornalieri (manuale ora)
- `prepare-copilot-context.sh` - Preparava context per Copilot (automazione rimossa)

### CI/CD (sostituiti da GitHub Actions o script più specifici)

- `local-pipeline.sh` - Pipeline locale completa (sostituito da `npm run verify`)
- `generate-release-notes.sh` - Generazione note rilascio (sostituito da `auto-release.cjs`)

### Testing (consolidati in test:all)

- `test-gateway-startup.sh` - Test startup gateway (integrato in suite Jest)
- `test-demo-users.sh` - Test demo users (integrato in suite Jest)

### Infrastructure (deprecati o non più necessari)

- `staging-startup.sh` - Startup staging (sostituito da docker compose diretto)
- `ensure-demo-users.sh` - Provisioning demo users (gestito da Keycloak init)
- `ensure-database.sh` - Garantiva DB attivo (gestito da health checks)

### Auditing (funzionalità non implementata)

- `audit-logs.sh` - Sanitizzazione log audit (feature non sviluppata)

## Come Recuperare

Se serve recuperare uno script:

```bash
# Copia dalla cartella archive
cp scripts/archive/SCRIPT_NAME.sh scripts/

# Rendi eseguibile
chmod +x scripts/SCRIPT_NAME.sh

# Aggiungi a package.json se necessario
```

## Script Attivi (per riferimento)

### Development

- `infra-start.sh`, `infra-stop.sh`
- `deploy-staging.sh`

### Testing

- `test-with-keycloak.sh` - Avvia Keycloak + esegue test + cleanup
- `test-cleanup.sh` - Cleanup manuale ambienti test
- `test-env-guard.sh` - Protezione DB production

### Code Quality

- `analyze-complexity.cjs` - Analisi complessità cognitiva
- `check-secrets.cjs` - Scan segreti hardcoded

### Release & Features

- `auto-release.cjs` - Release semantica automatica
- `update-features.js` - Aggiorna features.json da commit
- `version-calculator.js` - Calcola prossima versione

### Utilities

- `generate-keys.js` - Generazione chiavi (RSA, JWT, API keys)
- `generate-test-jwt.js` - JWT per testing
- `env-check.js` - Validazione variabili ambiente
- `release-analyzer.js` - Analisi release
- `ansible.sh` - Wrapper Ansible per deploy

**Ultima revisione**: 2025-12-10
