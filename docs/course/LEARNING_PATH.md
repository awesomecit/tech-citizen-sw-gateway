# Tech Citizen SW Gateway - Learning Path

**Corso**: Modern Backend Development with AI  
**Durata**: 100 ore (25 moduli × 4h)  
**Livello**: Principiante → Professionista  
**Modalità**: Project-Based Learning + AI-Assisted Development  
**Lingua**: 🇮🇹 Italiano (risorse tecniche in inglese)

---

## 🎯 Come Usare Questo Percorso

Questo documento è la **mappa completa** del corso. Per ogni modulo troverai:

1. **📚 Contenuti**: Cosa imparerai (teoria + pratica)
2. **🔗 Risorse**: Tutorial, guide, tool interattivi (priorità risorse italiane)
3. **💪 Esercizi**: Kata, challenge, progetti specifici per validare la comprensione
4. **✅ Validazione**: Quiz/test per verificare se puoi passare al prossimo modulo
5. **🎓 Output**: Deliverable concreto (commit, script, deployment)

---

## 📊 Prerequisiti e Entry Points

### Entry Point 1: Principiante Assoluto

**Background richiesto**:

- Sai usare un browser e un editor di testo
- Non hai mai scritto codice (ok!)
- Non sai cos'è un terminale (ok!)

**Start here**: **Modulo -1** (Pre-Corso Fondamenti)

---

### Entry Point 2: Programmatore Junior

**Background richiesto**:

- Conosci almeno un linguaggio (Python, JavaScript, Java, PHP)
- Sai cos'è una variabile, un loop, una funzione
- Hai già scritto qualche script/programma

**Start here**: **Modulo 0** (Linux & Shell)

---

### Entry Point 3: Backend Developer

**Background richiesto**:

- Hai già fatto backend con Express, Flask, Django, Spring
- Conosci REST API, database, autenticazione
- Vuoi imparare architetture moderne (microservices, observability)

**Start here**: **Modulo 6** (Fastify Framework)

---

## 🗺️ Mappa Completa del Percorso

```
📦 PRE-CORSO (solo per Entry Point 1)
└── Modulo -1: Fondamenti di Programmazione (8h)

🏗️ FONDAMENTA (Entry Point 2 standard)
├── Modulo 0: Linux & Shell (4h)
├── Modulo 1: Git & Version Control (4h)
├── Modulo 2: Docker Fundamentals (4h)
├── Modulo 3: Node.js Runtime (4h)
├── Modulo 4: TypeScript Deep Dive (4h)
└── Modulo 5: JavaScript Avanzato (4h)

🚀 BACKEND CORE (Entry Point 3 per esperti)
├── Modulo 6: Fastify Framework (6h)
├── Modulo 7: Observability Stack (6h)
├── Modulo 8: Code Patterns & Architecture (4h)
├── Modulo 9: Redis & RabbitMQ (6h)
└── Modulo 10: MinIO & Document Management (4h)

🔐 AUTENTICAZIONE & SICUREZZA
├── Modulo 11: OAuth2 & OIDC (6h)
├── Modulo 12: Keycloak Integration (4h)
└── Modulo 13: RBAC & Authorization (4h)

💻 FRONTEND BASICS
├── Modulo 14: UI Login Flow (4h)
├── Modulo 15: CRUD Operations (4h)
├── Modulo 16: Lists & Pagination (4h)
├── Modulo 17: Permission Guards (4h)
└── Modulo 18: State Management (4h)

⚙️ PRODUCTION & DEVOPS
├── Modulo 19: Networking & DNS (4h)
├── Modulo 20: Security & OWASP (4h)
├── Modulo 21: Testing (Unit/E2E/BDD) (6h)
├── Modulo 22: CI/CD Pipelines (4h)
└── Modulo 23: Production Deploy (4h)

🏥 SPECIALIZZAZIONE HEALTHCARE
├── Modulo 24: HL7, FHIR, DICOM (4h)
└── Modulo 25: Compliance & GDPR (4h)

🤖 AI & ADVANCED
├── Modulo 26: Y.js & Real-Time Collaboration (4h)
├── Modulo 27: Event Sourcing & CQRS (4h)
└── Modulo 28: AI Integration (LLM APIs) (4h)
```

---

## 📚 Modulo -1: Fondamenti di Programmazione (Pre-Corso)

**Target**: Chi non ha MAI scritto codice  
**Durata**: 8 ore (2 settimane part-time)  
**Goal**: Capire variabili, loop, funzioni, JSON

### 📖 Contenuti

1. **Cos'è la programmazione** (1h)
   - Algoritmi e pseudo-codice
   - Differenza tra compilazione e interpretazione
   - Hello World in JavaScript

2. **Variabili e tipi** (2h)
   - String, Number, Boolean, Array, Object
   - Assegnazione e mutabilità
   - Template literals

3. **Strutture di controllo** (2h)
   - if/else, switch
   - for, while, do-while
   - break, continue

4. **Funzioni** (2h)
   - Definizione e invocazione
   - Parametri e return
   - Arrow functions

5. **JSON e Object** (1h)
   - Sintassi JSON
   - JSON.parse() e JSON.stringify()
   - Accesso a proprietà

### 🔗 Risorse (100% Italiano)

| Risorsa                                                                                                             | Tipo        | Durata | Note                            |
| ------------------------------------------------------------------------------------------------------------------- | ----------- | ------ | ------------------------------- |
| [HTML.it JavaScript Base](https://www.html.it/guide/guida-javascript-di-base/)                                      | Tutorial    | 4h     | Gratuito, perfetto per iniziare |
| [FreeCodeCamp IT JavaScript](https://www.freecodecamp.org/italian/learn/javascript-algorithms-and-data-structures/) | Interattivo | 6h     | Con validazione automatica      |
| [Codecademy Learn JavaScript (IT)](https://www.codecademy.com/learn/introduction-to-javascript)                     | Interattivo | 10h    | Free tier disponibile           |

### 💪 Esercizi Pratici

**Esercizio 1: Calcolatrice**

```javascript
// TODO: Implementa funzione calculator(a, b, operation)
// operation può essere: 'add', 'subtract', 'multiply', 'divide'
// Ritorna il risultato o "Invalid operation"
```

**Esercizio 2: FizzBuzz**

```javascript
// Scrivi i numeri da 1 a 100
// Se multiplo di 3 stampa "Fizz"
// Se multiplo di 5 stampa "Buzz"
// Se multiplo di entrambi stampa "FizzBuzz"
```

**Esercizio 3: JSON Parser**

```javascript
// Dato un JSON di un utente, estrai nome, email, età
const user = '{"name":"Mario","email":"mario@test.it","age":30}';
// Stampa: "Mario ha 30 anni, contatto: mario@test.it"
```

### ✅ Validazione Pre-Modulo 0

**Quiz Autovalutazione** (5 domande, 80% pass):

1. Cos'è una variabile `const` in JavaScript?
   - [ ] Una variabile mutabile
   - [x] Una variabile immutabile
   - [ ] Una funzione

2. Cosa stampa `console.log([1,2,3].length)`?
   - [ ] undefined
   - [x] 3
   - [ ] 2

3. Quale sintassi è corretta per una arrow function?
   - [ ] `function => (x) { return x * 2 }`
   - [x] `(x) => x * 2`
   - [ ] `=> x { return x * 2 }`

4. Cos'è JSON?
   - [x] Un formato di scambio dati testuale
   - [ ] Un linguaggio di programmazione
   - [ ] Un database

5. Cosa fa `JSON.parse("{}")`?
   - [ ] Ritorna una stringa
   - [x] Ritorna un oggetto vuoto
   - [ ] Genera un errore

**Progetto Finale Pre-Corso**: Crea una TODO list console-based con funzioni add, remove, list

---

## 📚 Modulo 0: Linux & Shell

**Prerequisiti**: Modulo -1 OPPURE sai già programmare  
**Durata**: 4 ore  
**Goal**: Padroneggiare il terminale per sviluppo backend

### 📖 Contenuti

1. **Intro al terminale** (30min)
   - Cos'è una shell (bash, zsh)
   - Navigazione filesystem (`pwd`, `cd`, `ls`)
   - Path assoluti vs relativi

2. **File operations** (1h)
   - Crea/elimina file e cartelle (`touch`, `mkdir`, `rm`, `mv`, `cp`)
   - Visualizza contenuti (`cat`, `less`, `head`, `tail`)
   - Editor nano/vim basics

3. **Permessi e utenti** (1h)
   - `chmod`, `chown`
   - User, group, others
   - Symbolic vs numeric notation

4. **Process management** (1h)
   - `ps`, `top`, `htop`
   - Background jobs (`&`, `nohup`)
   - Kill processes

5. **Scripting base** (30min)
   - Shebang `#!/bin/bash`
   - Variabili e parametri `$1`, `$2`
   - Conditional `if [ -f file.txt ]`

### 🔗 Risorse (Priorità Italiano)

| Risorsa                                                                      | Tipo        | Lingua | Durata | Note                   |
| ---------------------------------------------------------------------------- | ----------- | ------ | ------ | ---------------------- |
| [Linux Survival](https://linuxsurvival.com/)                                 | Interattivo | 🇬🇧 EN  | 2h     | Browser-based terminal |
| [Terminus Game](https://web.mit.edu/mprat/Public/web/Terminus/Web/main.html) | Gioco       | 🇬🇧 EN  | 1h     | Impara giocando        |
| [HTML.it Linux Base](https://www.html.it/guide/guida-linux-di-base/)         | Tutorial    | 🇮🇹 IT  | 3h     | Gratuito completo      |
| [Codecademy Learn Bash](https://www.codecademy.com/learn/bash-scripting)     | Interattivo | 🇬🇧 EN  | 4h     | Validazione automatica |

### 💪 Esercizi Pratici

**Challenge 1: Navigazione filesystem**

```bash
# Vai nella home directory
cd ~

# Crea struttura: progetti/corso/modulo0
mkdir -p progetti/corso/modulo0

# Crea file notes.txt nella cartella modulo0
touch progetti/corso/modulo0/notes.txt

# Visualizza il path assoluto
pwd
```

**Challenge 2: Trova tutti i file .log**

```bash
# Cerca ricorsivamente dalla root
find /var/log -name "*.log" -type f

# Conta quanti ce ne sono
find /var/log -name "*.log" -type f | wc -l
```

**Challenge 3: Script di backup**

```bash
#!/bin/bash
# backup.sh - Crea backup con timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf backup_$TIMESTAMP.tar.gz ~/progetti
echo "Backup creato: backup_$TIMESTAMP.tar.gz"
```

**Challenge 4: Process monitor**

```bash
# Trova processo node in esecuzione
ps aux | grep node

# Killalo se esiste
pkill -f node
```

### ✅ Validazione Modulo 0

**Exercism Track**: [Bash Track](https://exercism.org/tracks/bash)

**Esercizi obbligatori**:

1. Hello World
2. Two Fer
3. Raindrops

**Quiz Autovalutazione** (10 domande, 70% pass):

1. Quale comando mostra il contenuto corrente della directory?
   - [ ] pwd
   - [x] ls
   - [ ] cd

2. Come rendi un file eseguibile?
   - [x] chmod +x file.sh
   - [ ] chmod 777 file.sh
   - [ ] chown file.sh

3. Cosa fa `ps aux | grep node`?
   - [ ] Elimina processi node
   - [x] Filtra processi contenenti "node"
   - [ ] Avvia node

4. Come redirigi l'output verso un file?
   - [ ] command < file.txt
   - [x] command > file.txt
   - [ ] command | file.txt

5. Cosa significa il permesso `644`?
   - [x] rw-r--r-- (owner read/write, others read)
   - [ ] rwxr-xr-x
   - [ ] rw-rw-rw-

**Progetto Finale Modulo 0**: Crea script `setup-dev.sh` che:

- Crea struttura cartelle progetto
- Installa dipendenze (Node, Git)
- Clona repository template
- Configura alias bash utili

**Output**: Commit script in repo personale + screenshot terminale

---

## 📚 Modulo 1: Git & Version Control

**Prerequisiti**: Modulo 0  
**Durata**: 4 ore  
**Goal**: Workflow Git professionale + branching strategies

### 📖 Contenuti

1. **Git basics** (1h)
   - init, clone, status
   - add, commit, push, pull
   - .gitignore

2. **Branching** (1h)
   - Crea/elimina branch
   - Merge vs rebase
   - Conflict resolution

3. **Workflow** (1h)
   - Trunk-based development
   - Feature branches
   - Pull requests

4. **Git hooks** (1h)
   - Pre-commit (linting, tests)
   - Commit-msg (conventional commits)
   - Pre-push (security scan)

### 🔗 Risorse

| Risorsa                                                               | Tipo        | Lingua | Durata | Note                    |
| --------------------------------------------------------------------- | ----------- | ------ | ------ | ----------------------- |
| [Learn Git Branching](https://learngitbranching.js.org/?locale=it_IT) | Interattivo | 🇮🇹 IT  | 2h     | Visualizzazione grafica |
| [Git Katas](https://www.katacoda.com/courses/git)                     | Hands-on    | 🇬🇧 EN  | 3h     | Esercizi pratici        |
| [HTML.it Git](https://www.html.it/guide/guida-git/)                   | Tutorial    | 🇮🇹 IT  | 2h     | Completo in italiano    |
| [Oh My Git!](https://ohmygit.org/)                                    | Gioco       | 🇬🇧 EN  | 1h     | Impara giocando         |

### 💪 Esercizi Pratici

**Challenge 1: Conventional Commits**

```bash
# Setup commitlint
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Commit validi:
git commit -m "feat(auth): add JWT validation"
git commit -m "fix(api): handle 404 errors"
git commit -m "docs(readme): update installation steps"
```

**Challenge 2: Rebase Interattivo**

```bash
# Crea 3 commit spazzatura
git commit -m "wip"
git commit -m "fix typo"
git commit -m "actually fix it"

# Squash in uno solo
git rebase -i HEAD~3
# Cambia pick → squash per gli ultimi 2
```

**Challenge 3: Cherry-pick**

```bash
# Crea branch feature con commit importante
git checkout -b feature
echo "importante" > file.txt
git add . && git commit -m "feat: add important feature"

# Torna a main e porta solo quel commit
git checkout main
git cherry-pick <commit-hash>
```

### ✅ Validazione Modulo 1

**Exercism Track**: Nessun track specifico, usa [Git-It Electron](https://github.com/jlord/git-it-electron)

**Progetto Finale Modulo 1**: Configura repository corso con:

- `.gitignore` per Node.js
- Husky hooks (pre-commit, commit-msg)
- Branch protection rules
- Almeno 5 commit conventional

**Output**: Link al repository pubblico GitHub

---

## 📚 Modulo 2: Docker Fundamentals

**Prerequisiti**: Modulo 0-1  
**Durata**: 4 ore  
**Goal**: Containerizzare applicazioni + Docker Compose

### 📖 Contenuti

1. **Container basics** (1h)
   - Immagini vs container
   - `docker run`, `ps`, `stop`, `rm`
   - Port mapping `-p 8080:80`

2. **Dockerfile** (1h)
   - FROM, COPY, RUN, CMD
   - Layer caching
   - Multi-stage builds

3. **Docker Compose** (1h 30min)
   - `docker-compose.yml` syntax
   - Services, networks, volumes
   - `up`, `down`, `logs`

4. **Networking** (30min)
   - Bridge, host, overlay
   - Service discovery
   - Health checks

### 🔗 Risorse

| Risorsa                                                    | Tipo        | Lingua | Durata | Note                 |
| ---------------------------------------------------------- | ----------- | ------ | ------ | -------------------- |
| [Play with Docker](https://labs.play-with-docker.com/)     | Sandbox     | 🇬🇧 EN  | 2h     | Browser-based Docker |
| [Katacoda Docker](https://www.katacoda.com/courses/docker) | Interattivo | 🇬🇧 EN  | 4h     | Scenari guidati      |
| [HTML.it Docker](https://www.html.it/guide/guida-docker/)  | Tutorial    | 🇮🇹 IT  | 3h     | Completo italiano    |
| [Docker Curriculum](https://docker-curriculum.com/)        | Tutorial    | 🇬🇧 EN  | 3h     | Step-by-step         |

### 💪 Esercizi Pratici

**Challenge 1: Containerizza Node.js app**

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

**Challenge 2: Multi-container con Compose**

```yaml
# docker-compose.yml
services:
  api:
    build: .
    ports:
      - '3000:3000'
    depends_on:
      - redis
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
```

**Challenge 3: Health check**

```yaml
services:
  api:
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:3000/health']
      interval: 30s
      timeout: 3s
      retries: 3
```

### ✅ Validazione Modulo 2

**Codewars Kata**: Nessun kata specifico, usa progetti pratici

**Progetto Finale Modulo 2**: Dockerizza una REST API Express con:

- Dockerfile multi-stage (build + runtime)
- Docker Compose con Redis + PostgreSQL
- Health checks funzionanti
- Volume per persistenza database

**Output**: Repository con `docker-compose up` funzionante + screenshot

---

## 📚 Modulo 3: Node.js Runtime

**Prerequisiti**: Modulo 0-2 + JavaScript  
**Durata**: 4 ore  
**Goal**: Event loop, modules, async patterns

### 📖 Contenuti

1. **Event Loop** (1h 30min)
   - Call stack, task queue, microtasks
   - setTimeout vs setImmediate
   - process.nextTick

2. **Modules** (1h)
   - CommonJS vs ESM
   - `require()` vs `import`
   - Package.json exports

3. **Async Patterns** (1h 30min)
   - Callbacks → Promises → async/await
   - Error handling
   - Promise.all, Promise.race

### 🔗 Risorse

| Risorsa                                                       | Tipo            | Lingua | Durata | Note                               |
| ------------------------------------------------------------- | --------------- | ------ | ------ | ---------------------------------- |
| [NodeSchool](https://nodeschool.io/#workshoppers)             | CLI Interattivo | 🇬🇧 EN  | 6h     | learnyounode, promise-it-wont-hurt |
| [Exercism Node Track](https://exercism.org/tracks/javascript) | Esercizi        | 🇬🇧 EN  | 10h    | Con mentorship                     |
| [HTML.it Node.js](https://www.html.it/guide/guida-node-js/)   | Tutorial        | 🇮🇹 IT  | 4h     | Completo italiano                  |

### 💪 Esercizi Pratici

**Challenge 1: Event Loop Quiz**

```javascript
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('4');
// Output? 1, 4, 3, 2
```

**Challenge 2: Async File Reader**

```javascript
const fs = require('fs').promises;

async function readFiles(paths) {
  const results = await Promise.all(
    paths.map(path => fs.readFile(path, 'utf-8')),
  );
  return results;
}
```

**Challenge 3: Retry Pattern**

```javascript
async function retry(fn, maxAttempts = 3) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === maxAttempts - 1) throw err;
      await new Promise(r => setTimeout(r, 1000 * i));
    }
  }
}
```

### ✅ Validazione Modulo 3

**NodeSchool Workshoppers** (obbligatori):

1. learnyounode (primi 10 esercizi)
2. promise-it-wont-hurt (completo)
3. stream-adventure (primi 5 esercizi)

**Progetto Finale Modulo 3**: CLI tool che:

- Legge file JSON in parallelo
- Filtra dati con criteri custom
- Scrive output con streams
- Gestisce errori con retry

**Output**: NPM package pubblicato (anche su npm test registry)

---

## 📚 Modulo 6: Fastify Framework

**Prerequisiti**: Modulo 0-5  
**Durata**: 6 ore  
**Goal**: Build production API con Fastify

### 📖 Contenuti

1. **Fastify Basics** (2h)
   - Request/Reply lifecycle
   - Route registration
   - Schema validation (TypeBox)

2. **Plugin System** (2h)
   - Encapsulation
   - Decorators
   - Hooks (onRequest, preHandler, etc.)

3. **Performance** (1h)
   - Benchmarking
   - Caching strategies
   - Async context

4. **Production Ready** (1h)
   - Logging (Pino)
   - Graceful shutdown
   - Health checks

### 🔗 Risorse

| Risorsa                                                                | Tipo           | Lingua | Durata | Note               |
| ---------------------------------------------------------------------- | -------------- | ------ | ------ | ------------------ |
| [Fastify Docs](https://fastify.dev/docs/latest/)                       | Documentazione | 🇬🇧 EN  | 8h     | Ufficiale completa |
| [Platformatic Docs](https://docs.platformatic.dev/)                    | Documentazione | 🇬🇧 EN  | 4h     | Per Watt specifico |
| [Fastify Workshop GitHub](https://github.com/fastify/fastify-workshop) | Hands-on       | 🇬🇧 EN  | 6h     | Step-by-step       |

### 💪 Esercizi Pratici

**Challenge 1: Auth Plugin**

```typescript
// packages/auth/src/index.ts
import fp from 'fastify-plugin';

async function authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (request, reply) => {
    const token = request.headers.authorization;
    if (!token) return reply.code(401).send({ error: 'Unauthorized' });
    // Validate JWT...
  });
}

export default fp(authPlugin);
```

**Challenge 2: TypeBox Validation**

```typescript
import { Type } from '@sinclair/typebox';

const UserSchema = Type.Object({
  name: Type.String({ minLength: 1 }),
  email: Type.String({ format: 'email' }),
  age: Type.Integer({ minimum: 18 }),
});

fastify.post('/users', {
  schema: { body: UserSchema },
  handler: async (request, reply) => {
    // request.body is typed!
    return { id: 123, ...request.body };
  },
});
```

### ✅ Validazione Modulo 6

**Progetto**: Implementa **US-041: TypeBox Schema Validation** dal backlog reale

**Acceptance Criteria**:

- [ ] Definisci schema per LoginRequest, SessionData, ErrorResponse
- [ ] Aggiungi validation middleware alle routes auth
- [ ] Test: Invalid body ritorna 400 con error details
- [ ] Test: Valid body passa validation
- [ ] Coverage > 90%

**Output**: Pull request al repository corso con tests passing

---

## 📚 Modulo 11: OAuth2 & OIDC

**Prerequisiti**: Modulo 0-10  
**Durata**: 6 ore  
**Goal**: Implementare login sicuro con Keycloak

### 📖 Contenuti

1. **OAuth2 Flows** (2h)
   - Authorization Code (con PKCE)
   - Client Credentials
   - Refresh Token

2. **OIDC Extension** (2h)
   - ID Token vs Access Token
   - UserInfo endpoint
   - Discovery document

3. **Keycloak Integration** (2h)
   - Realm setup
   - Client configuration
   - PKCE implementation

### 🔗 Risorse

| Risorsa                                                             | Tipo           | Lingua | Durata | Note               |
| ------------------------------------------------------------------- | -------------- | ------ | ------ | ------------------ |
| [OAuth.com](https://www.oauth.com/)                                 | Tutorial       | 🇬🇧 EN  | 4h     | Spiegazione chiara |
| [OAuth2 Playground](https://www.oauth.com/playground/)              | Interattivo    | 🇬🇧 EN  | 1h     | Testa i flow       |
| [Keycloak Docs](https://www.keycloak.org/docs/latest/server_admin/) | Documentazione | 🇬🇧 EN  | 6h     | Ufficiale          |

### 💪 Esercizi Pratici

**Challenge 1: PKCE Flow**

```typescript
// Generate code_verifier and code_challenge
import crypto from 'crypto';

function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return { verifier, challenge };
}
```

**Challenge 2: Keycloak Client**

```typescript
// Exchange code for tokens
async function exchangeCode(code: string, verifier: string) {
  const response = await fetch(`${KC_URL}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: verifier,
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
    }),
  });

  return response.json(); // { access_token, refresh_token, id_token }
}
```

### ✅ Validazione Modulo 11

**Progetto**: Implementa routes `/auth/login`, `/auth/callback` dal progetto reale

**Acceptance Criteria**:

- [ ] Login redirige a Keycloak con PKCE
- [ ] Callback scambia code con tokens
- [ ] Session salvata in Redis con TTL
- [ ] E2E test: Full login flow passa

**Output**: Commit con E2E tests green

---

## 🎓 Assessment Finale Corso

### Progetto Capstone: Tech Citizen SW Gateway

**Deliverable**: API Gateway production-ready con:

1. **Infrastructure** ✅
   - Docker Compose funzionante
   - Prometheus + Grafana dashboards
   - Health checks

2. **Authentication** ✅
   - Keycloak OIDC integration
   - Session management con sliding window
   - Protected routes con RBAC

3. **API Layer**
   - Almeno 3 servizi (gateway, auth, uno custom)
   - TypeBox validation su tutte le routes
   - Error handling consistente

4. **Testing**
   - Coverage > 80%
   - E2E tests (almeno 10 scenarios)
   - Integration tests con Testcontainers

5. **Production Deploy**
   - Deployed su server Hetzner
   - HTTPS con Caddy
   - CI/CD con GitHub Actions

### 📊 Grading Rubric

| Criterio             | Peso | Minimo Pass         |
| -------------------- | ---- | ------------------- |
| Infrastructure setup | 15%  | Docker Compose up   |
| Auth implementation  | 25%  | Login flow completo |
| API design           | 20%  | 3+ services         |
| Testing              | 20%  | Coverage > 80%      |
| Production deploy    | 15%  | HTTPS live          |
| Documentation        | 5%   | README + ADRs       |

**Pass**: 70%  
**Eccellenza**: 90%

---

## 📦 Risorse Aggiuntive

### Tool Consigliati

- **IDE**: VS Code + GitHub Copilot
- **Terminal**: iTerm2 (Mac) / Windows Terminal
- **Git GUI**: GitKraken / Sourcetree (opzionale)
- **API Testing**: Insomnia / Postman
- **Database**: TablePlus / DBeaver

### Community & Support

- **Discord**: [Tech Citizen Community](#) (link TBD)
- **Forum**: GitHub Discussions sul repo corso
- **Office Hours**: Mercoledì 18-19 (Italia time)

### Flashcard Decks

**Anki Decks** (da creare):

1. `Linux Commands` (50 carte)
2. `Git Workflow` (30 carte)
3. `Docker Concepts` (40 carte)
4. `TypeScript Types` (60 carte)
5. `Fastify Hooks` (25 carte)
6. `OAuth2 Flow` (35 carte)

**Download**: `docs/course/anki/` (TODO: generate)

---

## 🗓️ Piano di Studio Consigliato

### Full-Time (4 settimane)

```
Week 1: Moduli 0-5 (Fondamenta)
Week 2: Moduli 6-10 (Backend Core)
Week 3: Moduli 11-18 (Auth + UI)
Week 4: Moduli 19-25 (Production + Specializzazione)
```

### Part-Time (12 settimane)

```
Week 1-2: Moduli 0-2 (Linux, Git, Docker)
Week 3-4: Moduli 3-5 (Node.js, TypeScript)
Week 5-6: Moduli 6-8 (Fastify, Observability)
Week 7-8: Moduli 9-13 (Redis, Auth)
Week 9-10: Moduli 14-18 (UI Basics)
Week 11-12: Moduli 19-25 (Production + Advanced)
```

### Weekend Warrior (6 mesi)

```
8 ore/weekend = 32 ore/mese = ~3 moduli/mese
Month 1-2: Fondamenta (Moduli 0-5)
Month 3-4: Backend Core (Moduli 6-13)
Month 5: Frontend (Moduli 14-18)
Month 6: Production (Moduli 19-25)
```

---

**Maintainer**: Antonio Cittadino  
**Last Updated**: 2025-12-10  
**Version**: 1.0.0  
**License**: MIT

---

_Questo percorso è in continua evoluzione. Suggerimenti? Apri una issue!_
