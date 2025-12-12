# Hexagonal Testing Strategy - Copilot Context Document

**Project**: Tech Citizen SW Gateway  
**Last Updated**: 2025-12-12  
**Status**: Reference Architecture  
**Purpose**: Context document per AI assistants (Copilot, Claude, Cursor)

---

## 1. Architettura Esagonale: Fondamenti

L'architettura esagonale (detta anche "Ports and Adapters", ideata da Alistair Cockburn) è il pattern architetturale di riferimento per questo progetto. La metafora dell'esagono non ha significato geometrico: rappresenta semplicemente un "centro" (il dominio) circondato da "lati" (le porte) attraverso cui il mondo esterno comunica.

### 1.1 I Tre Strati Concentrici

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           ADAPTERS (Esterno)                            │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                         PORTS (Interfacce)                        │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                                                             │  │  │
│  │  │                     DOMAIN / CORE                           │  │  │
│  │  │                                                             │  │  │
│  │  │   • Business Logic pura                                     │  │  │
│  │  │   • Entità di dominio (User, Session, Token)                │  │  │
│  │  │   • Value Objects (Email, Password, UserId)                 │  │  │
│  │  │   • Domain Services (AuthService, SessionService)           │  │  │
│  │  │   • Nessuna dipendenza da framework o infrastruttura        │  │  │
│  │  │                                                             │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                   │  │
│  │  INBOUND PORTS (Driving)          OUTBOUND PORTS (Driven)         │  │
│  │  ─────────────────────            ──────────────────────          │  │
│  │  • IAuthUseCase                   • IUserRepository               │  │
│  │  • ISessionUseCase                • ISessionRepository            │  │
│  │  • IProfileUseCase                • ITokenRepository              │  │
│  │                                   • IEmailSender                  │  │
│  │                                   • IIdentityProvider             │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  INBOUND ADAPTERS (Primary)          OUTBOUND ADAPTERS (Secondary)      │
│  ──────────────────────────          ────────────────────────────       │
│  • FastifyAuthController             • KeycloakIdentityAdapter          │
│  • GraphQL Resolvers                 • RedisSessionAdapter              │
│  • CLI Commands                      • PostgresUserAdapter              │
│  • Message Queue Consumers           • SMTPEmailAdapter                 │
│  • gRPC Services                     • InMemoryAdapter (test)           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Regola delle Dipendenze

La regola fondamentale è che le dipendenze puntano sempre verso l'interno. Gli Adapters dipendono dalle Ports, le Ports dipendono dal Domain, ma il Domain non dipende da nulla. Questo significa che il codice di dominio non importa mai Fastify, Redis, Keycloak o qualsiasi altra libreria esterna. Le Ports sono interfacce TypeScript pure, definite all'interno del layer di dominio. Gli Adapters sono le implementazioni concrete che "parlano" con il mondo esterno e implementano quelle interfacce.

### 1.3 Struttura Concettuale del Codice

Il layer di dominio contiene i Value Objects (oggetti immutabili che incapsulano validazione, come Email o Password), le Entities (oggetti con identità e ciclo di vita, come User), e i Domain Services (classi che orchestrano la business logic usando le Ports).

Il layer delle Ports definisce le interfacce. Le Inbound Ports (o "Use Cases") descrivono cosa il sistema può fare dall'esterno, per esempio registrare un utente o effettuare login. Le Outbound Ports descrivono di cosa il dominio ha bisogno dal mondo esterno, per esempio salvare un utente nel database o inviare una email.

Il layer degli Adapters fornisce le implementazioni concrete. Gli Inbound Adapters traducono le richieste esterne (HTTP, CLI, messaggi) in chiamate alle Inbound Ports. Gli Outbound Adapters implementano le Outbound Ports parlando con database, servizi esterni, code di messaggi.

---

## 2. Testing Esagonale: La Piramide Rivisitata

L'architettura esagonale trasforma la classica "piramide dei test" in qualcosa di più preciso. Ogni strato ha il suo tipo di test dedicato, con obiettivi e caratteristiche specifiche.

### 2.1 Mappatura Strati → Tipi di Test

```
                        ┌─────────────────┐
                        │    E2E Tests    │  ← Testano l'INTERO sistema
                        │   (Cucumber)    │     attraverso i Primary Adapters
                        │    ~10 tests    │     (HTTP, UI)
                        └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    │   Integration Tests     │  ← Testano gli ADAPTERS
                    │    (Testcontainers)     │     con infrastruttura REALE
                    │      ~50-100 tests      │     (Keycloak, Redis, Postgres)
                    └────────────┬────────────┘
                                 │
           ┌─────────────────────┴─────────────────────┐
           │              Unit Tests                   │  ← Testano il DOMAIN
           │            (Tap + Mocks)                  │     in completo isolamento
           │            ~200-500 tests                 │     (zero infrastruttura)
           └───────────────────────────────────────────┘
```

### 2.2 Cosa Testa Ogni Livello

I test unitari verificano Domain Services, Entities e Value Objects utilizzando Tap con mock delle Ports. Non richiedono alcuna infrastruttura e sono estremamente veloci, nell'ordine del millisecondo per test.

I test di integrazione verificano gli Adapters (Keycloak, Redis, Postgres) utilizzando Testcontainers che avvia container Docker effimeri. Sono più lenti, circa 100 millisecondi per test, ma testano le implementazioni concrete.

I test E2E verificano flussi utente completi utilizzando Cucumber con un client HTTP contro lo stack completo avviato via docker-compose. Sono i più lenti, circa un secondo per test.

### 2.3 Regola d'Oro del Testing Esagonale

La regola fondamentale è semplice ma inviolabile: i test unitari non devono mai toccare infrastruttura reale, mentre i test di integrazione non devono mai mockare l'infrastruttura.

Questa separazione netta è possibile solo grazie alle Ports. Nei test unitari, si creano mock delle Outbound Ports (repository, email sender, identity provider) e si verifica che il Domain Service le utilizzi correttamente. Nei test di integrazione, si avvia un container reale (per esempio Keycloak) e si verifica che l'Adapter concreto funzioni correttamente contro quel servizio.

Tap rende questo approccio particolarmente elegante. La sua API minimalista e la struttura dei subtest permettono di organizzare i test in modo che rispecchino esattamente la struttura esagonale del codice. Ogni subtest può rappresentare un caso d'uso specifico, con setup e teardown locali che non interferiscono con altri test.

---

## 3. Testcontainers: Infrastruttura Effimera

Testcontainers è la chiave per testare gli Adapters senza mock. Avvia container Docker on-demand durante i test e li distrugge automaticamente alla fine.

### 3.1 Come Funziona

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Test Execution Timeline                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐  ┌───────────────────┐  ┌──────────┐  ┌──────────┐   │
│  │  before  │→ │ Start Containers  │→ │ Run Tests│→ │  after   │   │
│  └──────────┘  └───────────────────┘  └──────────┘  └──────────┘   │
│                         │                                   │       │
│                         ▼                                   ▼       │
│              ┌─────────────────────┐              ┌──────────────┐  │
│              │  Docker containers  │              │ Stop & Remove│  │
│              │  • Keycloak:random  │              │  containers  │  │
│              │  • Redis:random     │              └──────────────┘  │
│              │  • Postgres:random  │                                │
│              └─────────────────────┘                                │
│                         │                                           │
│                         ▼                                           │
│              ┌─────────────────────┐                                │
│              │  Port Allocation    │                                │
│              │  (dynamic, random)  │ ← Permette test paralleli!    │
│              └─────────────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.2 Filosofia di Testcontainers

Il punto fondamentale di Testcontainers è che non richiede un ambiente remoto speciale. Funziona ovunque ci sia Docker installato, che sia il laptop dello sviluppatore, un runner Woodpecker CI, o qualsiasi altro ambiente di build.

Quando un test di integrazione parte, Testcontainers avvia automaticamente i container necessari (Keycloak, Redis, PostgreSQL) su porte random. Questo permette di eseguire test in parallelo senza conflitti di porta. Al termine del test, i container vengono automaticamente fermati e rimossi.

L'allocazione dinamica delle porte è cruciale: ogni suite di test ottiene porte uniche, quindi più test possono girare contemporaneamente senza interferire. Testcontainers fornisce helper per ottenere la porta effettivamente assegnata dopo l'avvio del container.

### 3.3 Strategia di Avvio: Per-Suite vs Globale

Esistono due strategie per gestire i container nei test di integrazione.

La strategia "per-suite" avvia i container all'inizio di ogni file di test e li ferma alla fine. È più isolata ma più lenta, perché l'avvio di Keycloak può richiedere 30-60 secondi.

La strategia "globale" avvia i container una volta sola prima di tutti i test e li riusa. È più veloce per suite grandi, ma richiede attenzione per evitare che i test inquinino lo stato condiviso.

Per il progetto Tech Citizen, la strategia consigliata è quella globale per la CI (dove il tempo conta) e per-suite durante lo sviluppo locale (dove l'isolamento aiuta il debugging).

---

## 4. Strategia di Esecuzione: Dove e Quando

### 4.1 Matrice Completa

```
┌────────────────┬──────────────┬──────────────┬──────────────┬──────────────┐
│    Trigger     │  Unit Tests  │  Integration │   E2E Tests  │    Build     │
├────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Pre-commit     │      ✗       │      ✗       │      ✗       │      ✗       │
│ (lint only)    │              │              │              │              │
├────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Pre-push       │  ✓ (opz.)    │      ✗       │      ✗       │   ✓ (opz.)   │
│ (develop)      │  ~30 sec     │              │              │              │
├────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Woodpecker CI  │      ✓       │      ✓       │      ✓       │      ✓       │
│ (ogni push)    │   ~1 min     │   ~5 min     │   ~10 min    │   ~2 min     │
├────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ PR Gate        │      ✓       │      ✓       │      ✓       │      ✓       │
│ (obbligatorio) │              │              │              │              │
├────────────────┼──────────────┼──────────────┼──────────────┼──────────────┤
│ Release        │      ✓       │      ✓       │      ✓       │      ✓       │
│ (main only)    │              │              │  + smoke     │   + tag      │
└────────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
```

### 4.2 Workflow Visuale

```
Developer Workstation                        Woodpecker CI
═══════════════════                          ═══════════════

  [Modifica Codice]
        │
        ▼
  ╔═════════════╗
  ║ git commit  ║──────────────────────────────────────────┐
  ╚═════════════╝                                          │
        │                                                  │
        │ pre-commit hook                                  │
        │ • lint-staged (eslint, prettier)                 │
        │ • check-secrets                                  │
        │ • features:validate                              │
        │ • ⚠️ NO TESTS (troppo lento)                     │
        │                                                  │
        ▼                                                  │
  ╔═════════════╗                                          │
  ║  git push   ║──────────────────────────────────────────┤
  ╚═════════════╝                                          │
        │                                                  │
        │ pre-push hook (opzionale)                        │
        │ • npm run test:unit                              │
        │ • npm run build                                  │
        │                                                  │
        │                                                  │
        └──────────────────────────────────────────────────┘
                                                           │
                                                           ▼
                              ╔═══════════════════════════════════════════╗
                              ║       Woodpecker CI Pipeline              ║
                              ╠═══════════════════════════════════════════╣
                              ║                                           ║
                              ║  ┌─────────────────────────────────────┐  ║
                              ║  │         STEP: lint                  │  ║
                              ║  │         (node:20-alpine)            │  ║
                              ║  │  • npm run lint:check               │  ║
                              ║  │  • npm run format:check             │  ║
                              ║  │  • npx tsc --noEmit                 │  ║
                              ║  └─────────────────────────────────────┘  ║
                              ║                    │                      ║
                              ║  ┌─────────────────┴─────────────────┐    ║
                              ║  │                                   │    ║
                              ║  ▼                                   ▼    ║
                              ║  ┌──────────────────┐ ┌──────────────────┐║
                              ║  │ STEP: test-unit  │ │ STEP: test-integ │║
                              ║  │  (NO DOCKER)     │ │ (TESTCONTAINERS) │║
                              ║  │                  │ │                  │║
                              ║  │  npm test:unit   │ │  Keycloak ───┐   │║
                              ║  │  --coverage      │ │  Redis ──────┤   │║
                              ║  │                  │ │  Postgres ───┘   │║
                              ║  │  ~1 min          │ │                  │║
                              ║  └──────────────────┘ │  npm test:int    │║
                              ║           │           │  ~5 min          │║
                              ║           │           └──────────────────┘║
                              ║           │                    │          ║
                              ║           └─────────┬──────────┘          ║
                              ║                     ▼                     ║
                              ║           ┌──────────────────┐            ║
                              ║           │  STEP: test-e2e  │            ║
                              ║           │ (DOCKER COMPOSE) │            ║
                              ║           │                  │            ║
                              ║           │  Full stack up   │            ║
                              ║           │  Cucumber/Gherkin│            ║
                              ║           │  ~10 min         │            ║
                              ║           └──────────────────┘            ║
                              ║                     │                     ║
                              ║                     ▼                     ║
                              ║           ┌──────────────────┐            ║
                              ║           │   STEP: build    │            ║
                              ║           │                  │            ║
                              ║           │  npm run build   │            ║
                              ║           │  Docker image    │            ║
                              ║           └──────────────────┘            ║
                              ║                     │                     ║
                              ║            (solo se branch = main)        ║
                              ║                     ▼                     ║
                              ║           ┌──────────────────┐            ║
                              ║           │   STEP: deploy   │            ║
                              ║           │                  │            ║
                              ║           │  Ansible deploy  │            ║
                              ║           │  Smoke tests     │            ║
                              ║           └──────────────────┘            ║
                              ╚═══════════════════════════════════════════╝
```

---

## 5. Tap come Framework di Test

### 5.1 Perché Tap invece di Jest

Tap (Test Anything Protocol) è il framework di test scelto per questo progetto per diverse ragioni che si allineano bene con l'architettura esagonale.

La prima ragione è la semplicità. Tap ha un'API minimalista che non nasconde la meccanica dei test dietro "magia" di framework. Ogni test è esplicito su cosa sta verificando.

La seconda ragione è la struttura a subtest. Tap permette di annidare test in modo naturale, il che mappa perfettamente alla struttura esagonale: un blocco per il Domain, blocchi interni per ogni Service, blocchi ancora più interni per ogni metodo.

La terza ragione è la velocità. Tap è significativamente più veloce di Jest nell'avvio, il che conta quando si eseguono test unitari frequentemente durante lo sviluppo.

La quarta ragione è il supporto nativo per TypeScript. Con la configurazione corretta, Tap esegue direttamente file TypeScript senza necessità di compilazione preventiva.

### 5.2 Struttura dei File di Test

La convenzione per i file di test segue la struttura esagonale. I test unitari vivono accanto al codice che testano (colocation) con estensione ".test.ts". I test di integrazione vivono in una cartella separata "test/integration" con estensione ".integration.test.ts". I test E2E vivono nella cartella "e2e" con file Gherkin ".feature" e step definitions TypeScript.

### 5.3 Organizzazione dei Test nel Progetto

La struttura delle directory riflette la separazione tra i tre tipi di test. La cartella "src" contiene il codice di produzione e i test unitari colocati. La cartella "test" contiene gli helper condivisi, i fixtures, e i test di integrazione. La cartella "e2e" contiene le feature Cucumber e le relative step definitions.

Gli helper per Testcontainers vivono in "test/helpers" e sono condivisi da tutti i test di integrazione. I mock delle Ports vivono in "test/mocks" e sono usati dai test unitari.

---

## 6. Pipeline Woodpecker CI

### 6.1 Filosofia della Pipeline

Woodpecker CI è un sistema di continuous integration leggero e self-hosted, che si integra bene con l'approccio "artisanale" del progetto. La pipeline è strutturata in step sequenziali che rispecchiano la piramide dei test esagonale.

Ogni step della pipeline ha un obiettivo chiaro e fallisce velocemente se qualcosa non va. La filosofia è "fail fast": i controlli più veloci (lint, type check) vengono eseguiti per primi, così si ottiene feedback immediato su errori banali.

### 6.2 Struttura della Pipeline

La pipeline Woodpecker è definita nel file ".woodpecker.yml" alla radice del progetto. È composta da step che corrispondono ai livelli della piramide dei test.

Il primo step è il lint, che verifica formatting (Prettier), linting (ESLint), e type checking (TypeScript compiler in modalità noEmit). Questo step non richiede Docker ed è molto veloce.

Il secondo step esegue i test unitari con Tap. Non richiede Docker e verifica tutta la business logic di dominio usando mock delle Ports.

Il terzo step esegue i test di integrazione. Questo step richiede Docker disponibile nel runner Woodpecker (tramite montaggio del socket Docker o Docker-in-Docker). Testcontainers avvia Keycloak, Redis e PostgreSQL automaticamente.

Il quarto step esegue i test E2E. Avvia l'intero stack con docker-compose e esegue le feature Cucumber contro di esso.

Il quinto step esegue il build solo se tutti i test sono passati. Compila TypeScript, costruisce l'immagine Docker, e la tagga con lo SHA del commit.

Il sesto step, condizionato al branch main, esegue il deploy via Ansible e uno smoke test finale.

### 6.3 Considerazioni sui Runner Woodpecker

I runner Woodpecker possono eseguire i test di integrazione con Testcontainers in due modi. Il primo modo è montare il socket Docker dell'host nel container del runner, permettendo ai test di creare container "sibling". Il secondo modo è usare Docker-in-Docker (dind), che è più isolato ma leggermente più lento.

Per il progetto Tech Citizen, la configurazione raccomandata è il montaggio del socket Docker, dato che il server Woodpecker è controllato direttamente e non ci sono preoccupazioni di isolamento multi-tenant.

---

## 7. Connessione tra Test e Architettura Esagonale

### 7.1 Come i Test Verificano la Struttura

L'architettura esagonale non è solo un diagramma: i test la rendono concreta e la proteggono da violazioni accidentali.

I test unitari verificano che il Domain sia effettivamente indipendente dall'infrastruttura. Se un Domain Service inizia a importare una libreria esterna (Redis, Keycloak), i test unitari falliranno perché i mock non forniranno quelle dipendenze.

I test di integrazione verificano che gli Adapters funzionino correttamente con l'infrastruttura reale. Se l'Adapter Keycloak smette di funzionare dopo un upgrade di Keycloak, i test di integrazione lo cattureranno.

I test E2E verificano che l'intero sistema, assemblato insieme, soddisfi i requisiti di business espressi in linguaggio Gherkin.

### 7.2 Il Ruolo delle Ports come "Seam" per il Testing

Le Ports sono il punto di giunzione (seam) che permette questa separazione netta. Nei test unitari, si iniettano mock delle Ports. Nei test di integrazione, si iniettano implementazioni reali delle Ports.

Questo significa che lo stesso Domain Service viene testato in due modi complementari. I test unitari verificano la logica interna assumendo che le Ports facciano il loro lavoro. I test di integrazione verificano che le implementazioni concrete delle Ports facciano effettivamente il loro lavoro.

### 7.3 Copertura e Confidenza

La combinazione dei tre livelli di test fornisce alta confidenza con minimo sforzo di manutenzione. I test unitari, essendo veloci e numerosi, coprono tutti i casi edge della business logic. I test di integrazione, essendo focalizzati sugli Adapters, coprono le interazioni con sistemi esterni. I test E2E, essendo pochi ma significativi, coprono i flussi utente critici.

La regola empirica è la seguente: se un bug viene scoperto in produzione, la prima domanda da porsi è "quale tipo di test avrebbe dovuto catturarlo?". Se è un bug di logica di business, serviva un test unitario. Se è un bug di integrazione con un servizio esterno, serviva un test di integrazione. Se è un bug di flusso utente, serviva un test E2E.

---

## 8. Checklist Implementazione

### 8.1 Fase 1: Setup Base

La prima fase richiede l'installazione delle dipendenze Tap e Testcontainers, la creazione della struttura delle directory per i test, e la configurazione base di Tap per TypeScript.

### 8.2 Fase 2: Test Unitari

La seconda fase prevede la creazione dei mock per tutte le Outbound Ports, la scrittura dei test unitari per i Domain Services esistenti, e la verifica che i test passino senza alcun container Docker.

### 8.3 Fase 3: Test di Integrazione

La terza fase prevede la creazione degli helper Testcontainers per Keycloak, Redis e PostgreSQL, la scrittura dei test di integrazione per tutti gli Adapters, e la verifica che i test funzionino sia in locale che in CI.

### 8.4 Fase 4: Test E2E

La quarta fase prevede la scrittura delle feature Cucumber per i flussi utente principali, la creazione delle step definitions, e l'integrazione con la pipeline Woodpecker.

### 8.5 Fase 5: CI Integration

La quinta fase prevede la configurazione del file .woodpecker.yml con tutti gli step, il setup dei secrets necessari (SSH key per deploy, credenziali Docker registry), e la verifica end-to-end dell'intera pipeline.
