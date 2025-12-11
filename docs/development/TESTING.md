# Testing Fundamentals: Smoke Test e Flaky Test

Due concetti che ogni developer deve conoscere per non impazzire in CI/CD.

---

## Smoke Test

### Cos'è

Un test veloce che risponde a una sola domanda: **"L'applicazione si accende senza esplodere?"**

Il nome viene dall'elettronica: quando accendi un circuito nuovo, se esce fumo hai un problema serio. Non serve testare altro.

### Quando si usa

Prima di tutto il resto. Se lo smoke test fallisce, non ha senso eseguire centinaia di altri test.

### Cosa verifica

Solo le funzionalità vitali:

- L'applicazione si avvia
- Il database è raggiungibile
- Gli endpoint principali rispondono
- Le dipendenze critiche sono disponibili

### Esempio pratico

```bash
# Smoke test minimale per un'API
curl -f http://localhost:3000/health || exit 1
```

Se `/health` non risponde 200, il sistema è rotto. Stop.

### Regola d'oro

> Uno smoke test deve durare **secondi**, non minuti.  
> Se impiega troppo, non è uno smoke test.

---

## Flaky Test

### Cos'è

Un test che **a volte passa, a volte fallisce** senza che il codice sia cambiato.

È il nemico numero uno di una test suite affidabile.

### Perché è un problema grave

Quando i test falliscono a caso, succede questo:

1. Il team inizia a ignorare i fallimenti ("ah, è solo flaky")
2. Un bug vero passa inosservato
3. Arriva in produzione
4. Tutti piangono

### Le cause più comuni

**1. Race condition**

```typescript
// ❌ FLAKY: dipende da quanto veloce è il sistema
await saveUser(user);
const found = await getUser(user.id); // potrebbe non trovarlo ancora!
```

```typescript
// ✅ STABILE: aspetta esplicitamente
await saveUser(user);
await waitFor(() => getUser(user.id));
```

**2. Stato condiviso tra test**

```typescript
// ❌ FLAKY: se test A modifica il DB, test B potrebbe fallire
it('should find 3 users', async () => {
  const users = await getAllUsers();
  expect(users).toHaveLength(3); // ma test A ne ha aggiunto uno!
});
```

```typescript
// ✅ STABILE: ogni test parte da zero
beforeEach(async () => {
  await clearDatabase();
  await seedTestData();
});
```

**3. Dipendenza da date e orari**

```typescript
// ❌ FLAKY: fallisce a mezzanotte o a fine mese
expect(formatDate(new Date())).toBe('2024-01-15');
```

```typescript
// ✅ STABILE: data fissa e controllata
const fixedDate = new Date('2024-01-15T10:00:00Z');
expect(formatDate(fixedDate)).toBe('2024-01-15');
```

**4. Ordine di esecuzione**

```typescript
// ❌ FLAKY: funziona solo se test A gira prima di test B
it('test A - creates token', () => { ... });
it('test B - uses token', () => { ... });  // fallisce se gira da solo
```

```typescript
// ✅ STABILE: ogni test è indipendente
it('test B - uses token', () => {
  const token = createTestToken(); // crea il suo token
  // ...
});
```

**5. Risorse esterne**

```typescript
// ❌ FLAKY: dipende da internet e da un servizio esterno
const weather = await fetch('https://api.weather.com/today');
```

```typescript
// ✅ STABILE: mock della chiamata esterna
jest.mock('node-fetch');
fetch.mockResolvedValue({ temp: 20 });
```

### Come riconoscere un flaky test

- Fallisce in CI ma passa in locale (o viceversa)
- Fallisce solo quando i test girano in parallelo
- Fallisce "ogni tanto" senza motivo apparente
- Passa se lo esegui da solo, fallisce nella suite completa

### Come gestirlo

**Soluzione giusta:** Trova la causa e fixalo. Usa le checklist sopra.

**Soluzione temporanea:** Quarantena. Spostalo in una suite separata, marcalo come `skip`, ma **apri un ticket** per risolverlo.

**Soluzione sbagliata:** Aggiungere retry automatici e sperare che passi. Stai solo nascondendo il problema.

---

## Riassunto visivo

```
SMOKE TEST                         FLAKY TEST
────────────                       ──────────
"Funziona?"                        "Perché a volte no?"

   ✓ Veloce (secondi)                 ✗ Inaffidabile
   ✓ Essenziale                       ✗ Erode la fiducia
   ✓ Bloccante se fallisce            ✗ Nasconde bug veri

   Esegui PRIMA di tutto              Elimina APPENA lo trovi
```

---

## Checklist da stampare

Quando scrivi un test, chiediti:

- [ ] Può fallire se cambia l'ora o la data?
- [ ] Dipende da un altro test eseguito prima?
- [ ] Usa stato globale o condiviso?
- [ ] Chiama servizi esterni reali?
- [ ] Ha timeout troppo stretti?
- [ ] Assume un ordine specifico di esecuzione?

Se hai risposto **sì** a qualcuna, hai un potenziale flaky test.

---

## Test Infrastructure (Dicembre 2025)

### Hybrid Bash/Node Architecture

L'infrastruttura di test utilizza un approccio ibrido:

- **Bash scripts** gestiscono Docker Compose (orchestrazione container)
- **Node wrappers** espongono API per test TypeScript/Jest
- **Isolamento completo** tra ambienti test/dev tramite naming convention

### Container Isolation Strategy

#### Environment Naming

```bash
# Test environment
COMPOSE_ENV_SUFFIX="-test"           # Container suffix
COMPOSE_PROJECT_NAME="keycloak-test" # Network/volume prefix

# Created resources:
tech-citizen-keycloak-test           # Container
tech-citizen-redis-session-test      # Container
keycloak-test_tech-citizen-network   # Network
keycloak-test_redis-session-data     # Volume
```

#### Development environment rimane intatto

```bash
# No suffix/prefix
tech-citizen-keycloak                # Container
tech-citizen-redis-session           # Container
keycloak_tech-citizen-network        # Network
keycloak_redis-session-data          # Volume
```

### Idempotent Startup

Lo script `test-infra-start.sh` è idempotente:

1. **Check**: Verifica se container già running e healthy
2. **Skip**: Se già pronto, evita restart inutili
3. **Restart**: Solo se running ma not healthy
4. **Create**: Solo se non esistente

```bash
# Riutilizza container esistente se healthy
if docker ps --filter "name=tech-citizen-keycloak-test" | grep -q "keycloak-test"; then
  if curl -sf http://localhost:8090/health/ready > /dev/null; then
    echo "Already healthy, skipping..."
    continue
  fi
fi
```

### Test Commands

```bash
# Unit tests (no infrastructure)
npm run test:unit

# Integration tests (with Keycloak + Redis)
npm run test:integration:infra

# E2E tests (with Keycloak + Redis + Gateway)
npm run test:e2e:infra

# Full suite (unit → integration → e2e)
npm test
```

### Process Cleanup (E2E)

I test E2E usano **process group kill** per gestire correttamente la catena `npm → node`:

```typescript
// Spawn con process group separato
wattProcess = spawn('npm', ['run', 'dev'], {
  detached: true, // Crea process group
  env: { NODE_ENV: 'test' },
});

// Kill di tutto il gruppo (npm + node children)
process.kill(-wattProcess.pid, 'SIGTERM'); // Negative PID kills group
```

### Real-time Logging

I log di infrastructure e test sono visibili in real-time grazie a `process.stdout.write()`:

```typescript
wattProcess.stdout?.on('data', data => {
  const output = data.toString();
  process.stdout.write(output); // No buffering
});
```

### File Locations

- **Bash orchestration**: `scripts/test-infra-start.sh`, `scripts/test-infra-stop.sh`
- **Docker Compose**: `infrastructure/keycloak/docker-compose.keycloak.yml`
- **E2E tests**: `e2e/smoke/startup.test.ts`
- **Jest configs**: `jest.config.cjs`, `jest.integration.config.cjs`, `jest.e2e.config.cjs`

---

> **"Un test che fallisce a caso è peggio di nessun test."**
