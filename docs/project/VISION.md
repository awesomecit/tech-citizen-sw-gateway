# Tech Citizen SW Gateway — Piattaforma Enterprise Multi-Dominio

**Versione**: 2.0.0 | **Ultimo aggiornamento**: Dicembre 2025  
**Licenza**: MIT | **Standard**: OpenTelemetry, CloudEvents, RFC-5545, eIDAS

---

## Executive Summary

Tech Citizen SW Gateway è una piattaforma modulare enterprise-grade progettata per orchestrare servizi backend con focus su compliance, collaborazione real-time e osservabilità completa. Sebbene il caso d'uso primario sia il settore healthcare, l'architettura è domain-agnostic e configurabile per qualsiasi verticale: legal, education, finance, manufacturing.

La piattaforma combina Platformatic Watt per l'orchestrazione dei microservizi, Fastify per performance HTTP, Keycloak per identity management enterprise, e un ecosistema completo di strumenti open source per observability, automazione e collaborazione.

---

## Indice

1. Informazioni Corso
2. Filosofia Open Source e Standard
3. Stack Tecnologico Completo
4. Architettura di Sistema
5. Sistema Operatori Multi-Dominio
6. Struttura Organizzativa Gerarchica
7. Servizi Core della Piattaforma
8. Observability Stack Completo
9. Sistema di Revisioni e Audit
10. Collaborazione Real-Time e Offline
11. Servizio Calendari e Scheduling
12. Automazioni No-Code con n8n
13. Reportistica e Gestione Documenti
14. Autenticazione e Autorizzazione
15. Feature List Completa
16. Metriche di Affidabilità Enterprise
17. Sezioni del Corso
18. Integrazione AI nel Progetto
19. Roadmap e Backlog
20. Esempio: Configurazione Dominio Legal
21. Risorse e Riferimenti

---

## 1. Informazioni Corso

Il progetto nasce come materiale didattico per il corso "Modern Backend Development with AI", un percorso formativo completo che guida lo sviluppatore dalla configurazione di un ambiente Linux fino alla produzione di sistemi enterprise-grade.

Il corso ha una durata totale di circa 100 ore, è erogato in lingua italiana con materiali tecnici in inglese, e segue una metodologia di project-based learning. Il livello parte da principiante e arriva a professionista, attraverso 25 sezioni progressive e 10 moduli video da circa 10 minuti ciascuno. Il progetto finale consiste nella realizzazione di un API Gateway healthcare production-ready.

Lo studente ideale ha familiarità base con la programmazione, ma il corso parte dalle fondamenta. I prerequisiti tecnici includono un computer con almeno 8GB RAM, connessione internet stabile, e la volontà di sperimentare con ambienti Linux.

Al termine del corso, lo studente sarà in grado di progettare architetture backend scalabili, implementare sistemi di autenticazione enterprise-grade, configurare stack di observability completi, e utilizzare AI come copilota nello sviluppo quotidiano.

---

## 2. Filosofia Open Source e Standard

### Commitment Open Source

Tech Citizen SW Gateway adotta una filosofia "open source first". Ogni componente della piattaforma è selezionato privilegiando soluzioni con licenze permissive come MIT, Apache 2.0, e BSD che garantiscono libertà di utilizzo, modifica e distribuzione commerciale.

### Standard Adottati

La piattaforma aderisce rigorosamente a standard industriali consolidati per garantire interoperabilità e longevità delle scelte tecnologiche.

OpenTelemetry rappresenta il framework di riferimento per la telemetria. Sviluppato sotto l'egida della Cloud Native Computing Foundation, OpenTelemetry fornisce un'API vendor-neutral per la raccolta di metriche, log e trace distribuiti. Questa scelta elimina il vendor lock-in e permette di sostituire i backend di storage senza modificare l'instrumentazione applicativa.

CloudEvents standardizza il formato degli eventi distribuiti. Ogni messaggio che transita attraverso RabbitMQ o Redis Pub/Sub segue lo schema CloudEvents, garantendo interoperabilità con sistemi esterni e facilitando l'integrazione con piattaforme di terze parti.

RFC-5545, noto come iCalendar, definisce il formato per eventi ricorrenti nel servizio calendari. L'adozione di RRULE per la definizione delle ricorrenze garantisce compatibilità con Google Calendar, Outlook, e qualsiasi client calendar standard.

Per le firme digitali, il sistema supporta gli standard europei eIDAS nelle forme PAdES, CAdES e XAdES, essenziali per conformità legale in ambito sanitario e oltre.

### Licenze dei Componenti Principali

Platformatic utilizza licenza Apache 2.0 che permette uso commerciale. Fastify adotta MIT per massima libertà. Keycloak è Apache 2.0 con enterprise features incluse. SigNoz è MIT con alcune parti AGPL, self-host gratuito. GlitchTip è MIT e Sentry-compatible. n8n usa Sustainable Use License, free per self-host. JSReport offre core gratuito con licenza LGPL e opzione Enterprise.

---

## 3. Stack Tecnologico Completo

### Layer Applicativo

Il sistema si articola su più layer. Il presentation layer comprende le frontend apps quali patient-portal, admin-dashboard e operator-ui, con framework ancora da decidere tra Next.js 14 e SvelteKit come indicato nell'ADR-008 pending.

L'API Gateway è costruito su Platformatic Watt 3.x insieme a Fastify 5.x e TypeScript, integrando autenticazione Keycloak OIDC, cache con async-cache-dedupe, e sistema RBAC.

Il layer dei backend services include servizi modulari per pazienti, calendario, collaborazione, reportistica, operatori, revisioni, lock e documenti.

Il data layer si basa su PostgreSQL con Row-Level Security, Redis 7.x, RabbitMQ 3.13+, e MinIO per storage S3-compatible.

### Tecnologie per Layer

Per quanto riguarda orchestrazione e runtime, Platformatic Watt 3.x orchestra i microservizi con comunicazione interna via message passing, eliminando l'overhead HTTP per chiamate inter-service. Ogni servizio è un'istanza Fastify isolata con il proprio contesto di plugin.

Come API framework, Fastify 5.x fornisce il layer HTTP con performance best-in-class di circa 75.000 richieste al secondo su hardware modesto. Il sistema di plugin con encapsulation garantisce isolamento tra servizi e composabilità dei moduli.

Il linguaggio scelto è TypeScript 5.x con strict mode abilitato. Gli schemi sono definiti con TypeBox per generazione automatica di JSON Schema e type inference.

Per il database si utilizza PostgreSQL 16 con Row-Level Security per multi-tenancy. Le tabelle temporali con tstzrange supportano il sistema di revisioni. Redis 7.x gestisce session, cache, lock distribuiti e presence.

Come message broker si usa RabbitMQ per comunicazione asincrona event-driven, con supporto per dead-letter queues per gestione errori e retry automatici.

L'identity provider è Keycloak 23+ per autenticazione OIDC, SSO, e federazione LDAP/SAML, con supporto multi-realm per isolamento tenant.

Per object storage si usa MinIO per documenti e allegati, con API S3-compatible per portabilità verso cloud provider.

---

## 4. Architettura di Sistema

### Panoramica Architetturale

L'architettura si sviluppa su più layer partendo dall'esterno. Il traffico entra attraverso Cloudflare che fornisce WAF e CDN, poi passa all'edge layer gestito da Caddy 2.x per TLS termination, proxy, rate limiting e sicurezza.

Il gateway layer è gestito da Platformatic Watt e contiene l'API Gateway Fastify 5.x con i suoi plugin: Auth Plugin, RBAC Plugin, Cache Dedupe, Rate Limiter, Circuit Breaker e Audit Logger.

Il service layer contiene i servizi di business: Operator Service per la gestione operatori, Calendar Service basato su RFC-5545, Collaboration Service con Y.js, Document Service con JSReport, Revision Service per audit e history, Lock Service basato su Redlock, Presence Service su Redis, e Report Service per generazione PDF.

Il data layer comprende PostgreSQL 16 con RLS e temporal tables, Redis 7.x OSS per session, cache, lock e presence, RabbitMQ 3.13+ per eventi CloudEvents, e MinIO S3-compatible per documenti e firme.

L'identity layer è gestito da Keycloak 23+ con realm separati: master per il sistema, healthcare-domain per il dominio applicativo, e realm aggiuntivi per multi-tenancy.

L'observability layer include SigNoz per APM con OpenTelemetry nativo, GlitchTip per error tracking Sentry-compatible, Prometheus per metriche, Loki per log, e Tempo per trace, il tutto visualizzato in Grafana per dashboard e alerting.

L'automation layer è gestito da n8n con workflow automation, 400+ integrazioni, AI agents, custom triggers, webhooks e scheduled jobs.

### Modularità Backend Services

L'architettura è progettata per plug-and-play dei backend services. Qualsiasi team può implementare un servizio custom purché rispetti le interfacce e i vincoli definiti.

Ogni backend service deve esporre un health check obbligatorio che restituisce lo stato del servizio come healthy, degraded o unhealthy con timestamp. Deve inoltre esporre metriche in formato Prometheus. Opzionalmente ma raccomandato, può implementare le operazioni CRUD standard per le risorse gestite.

Il progetto sfrutta la struttura a cartelle di Fastify per generare automaticamente CRUD standard prima del layer di revisioni e audit. La struttura prevede cartelle per le routes che vengono auto-caricate, con sottocartelle per parametri dinamici e hook comuni per auth e validation. L'ordine di esecuzione garantisce che ogni write operation passi attraverso authentication e authorization, validation con TypeBox, business logic nel route handler, revision layer che auto-genera la revisione, e infine audit logger che registra l'operazione.

---

## 5. Sistema Operatori Multi-Dominio

### Filosofia: Domain-Agnostic Operators

Il sistema non è limitato al dominio healthcare. Gli Operatori sono entità di business configurabili che rappresentano qualsiasi tipo di utente di dominio: medici, avvocati, insegnanti, operai, consulenti.

### Modello Dati Operatori

La tabella principale degli operatori contiene l'anagrafica base con codice operatore univoco, nome, cognome, email e telefono. Ogni operatore ha un tipo che referenzia la tabella dei tipi operatore, e appartiene a una gerarchia organizzativa composta da organizzazione, divisione, dipartimento e team.

Il link con l'utente sistema Keycloak è opzionale: il campo system_user_id può essere NULL se l'operatore non è ancora stato linkato o validato. La validazione richiede conferma esplicita da parte di un admin, registrando chi ha validato e quando.

I tipi operatore sono anagrafiche configurabili per ogni tenant. Ogni tipo ha un codice identificativo, un nome visualizzabile, una descrizione, e appartiene a un dominio specifico come healthcare, legal, o education. Può avere icona e colore per la UI, e soprattutto definisce le capabilities di default che vengono assegnate agli operatori di quel tipo. Un campo metadata estendibile permette configurazioni aggiuntive.

Per il dominio healthcare, i tipi operatore predefiniti sono doctor (medico) con capabilities di lettura e scrittura pazienti, prescrizioni e documenti; nurse (infermiere) con lettura pazienti, scrittura vitali e lettura documenti; patient (paziente) con accesso self-service per lettura e scrittura propri dati e creazione appuntamenti.

### Matrice Permessi MatrixPar

Il sistema MatrixPar gestisce la matrice permessi attraverso un'interfaccia admin configurabile. La matrice è definita a tre livelli: ruoli, permessi, e capabilities custom.

I ruoli sono entità assegnabili agli operatori, ciascuno con codice, nome e descrizione. Possono avere una gerarchia con ruolo padre per ereditarietà, e possono essere sincronizzati con ruoli Keycloak.

I permessi rappresentano azioni su risorse, definiti come combinazione di risorsa (patient, document, appointment) e azione (read, write, delete, admin).

La matrice ruolo-permessi associa ruoli e permessi, con possibilità di condizioni opzionali per implementare ABAC, ad esempio limitare l'accesso ai soli dati propri o al proprio dipartimento.

L'assegnazione ruoli a operatori può essere limitata per scope organizzativo, può avere scadenza per ruoli temporanei, e registra chi ha assegnato il ruolo e quando.

Le capabilities custom permettono override per singolo operatore, potendo sia concedere che revocare permessi rispetto a quanto definito dai ruoli, con motivazione per audit e possibile scadenza.

### Link Operatore e Utente Sistema

Il flusso di linking tra operatore (anagrafica di dominio) e utente sistema (Keycloak) prevede diverse fasi. Prima l'admin crea l'operatore con i dati anagrafici ma senza link all'utente sistema. Quando l'utente fa login via OIDC, il sistema può suggerire un match basato sull'email. L'admin deve validare manualmente il link per confermarlo. Solo dopo la validazione l'operatore risulta effettivamente collegato all'utente Keycloak.

I criteri di accettazione per il sistema operatori prevedono che l'admin possa creare tipi operatore con capabilities di default, creare operatori con tipo e gerarchia organizzativa, e che il sistema suggerisca link quando l'email operatore corrisponde all'email Keycloak. L'admin deve validare manualmente il link operatore-utente sistema, le capabilities custom possono sovrascrivere i permessi da ruolo, i ruoli possono essere temporanei con scadenza automatica, e deve esserci audit trail completo di ogni modifica ai permessi.

---

## 6. Struttura Organizzativa Gerarchica

### Modello a 4 Livelli

Ogni entità nel sistema appartiene a una gerarchia organizzativa configurabile strutturata su quattro livelli: Organizzazione al vertice, che contiene Divisioni, che a loro volta contengono Dipartimenti, che infine contengono Blocchi o Team.

### Descrizione delle Entità

Le organizzazioni rappresentano il livello tenant e contengono codice, nome, descrizione, configurazioni specifiche, branding con logo e colori, e informazioni di contatto.

Le divisioni appartengono a un'organizzazione e possono avere un manager designato tra gli operatori, oltre a configurazioni proprie.

I dipartimenti appartengono a una divisione, possono avere un manager, e configurazioni specifiche per il dipartimento.

I team o blocchi sono il livello più granulare, appartengono a un dipartimento, possono avere un leader, e configurazioni di team.

### Assegnazione Default

Se un operatore non ha gerarchia esplicita, il sistema assegna automaticamente una struttura di default. La logica verifica se manca l'organizzazione e in tal caso usa o crea quella di default per il tenant. Analogamente per divisione, dipartimento e team, creando o usando i default se mancanti. Questo garantisce che ogni operatore abbia sempre una collocazione organizzativa valida.

---

## 7. Servizi Core della Piattaforma

### Operator Service

Gestisce anagrafiche operatori, tipi operatore, e linking con utenti sistema. Gli endpoint principali permettono di listare operatori con filtri per tipo, organizzazione e stato validazione, creare nuovi operatori, aggiornare operatori esistenti, linkare un operatore a un utente Keycloak, validare il link operatore-utente, listare e creare tipi operatore configurati.

### Revision Service

Il sistema di revisioni e audit trail supporta tre strategie. Event Sourcing per dati critici dove ogni modifica genera un evento immutabile contenente identificativo evento, aggregato, tipo evento, payload, metadata con userId, timestamp e correlationId, e numero di versione. Temporal Tables per anagrafiche con query point-in-time che permettono di interrogare lo stato di un'entità a una specifica data nel passato. History Tables per dati amministrativi con audit semplice tramite tabelle separate e trigger.

### Lock e Presence Service

Il sistema di lock distribuiti e presenza real-time è basato su Redis. Il pattern delle chiavi è gerarchico nella forma tipo_risorsa:uuid:sotto_risorsa, permettendo di rappresentare lock a diversi livelli di granularità: sul documento intero, su una sezione, o su un singolo campo.

La gestione dei lock morti utilizza TTL e heartbeat. Ogni lock ha un TTL di default di 30 secondi, con heartbeat ogni 10 secondi per estensione automatica. Se il client che detiene il lock non rinnova l'heartbeat, il lock scade automaticamente prevenendo deadlock.

Il servizio broadcasting eventi pubblica su Redis Pub/Sub eventi di lock acquisito, lock rilasciato, lock forzatamente rilasciato da admin, e aggiornamenti presenza utenti.

### Cache Dedupe Service

Utilizza async-cache-dedupe di Matteo Collina per deduplicare richieste POST/PUT con body identico. Quando multiple richieste identiche arrivano contemporaneamente, solo una viene effettivamente eseguita mentre le altre ricevono lo stesso risultato. La finestra di deduplica è tipicamente di 5 secondi. L'header Idempotency-Key permette retry sicuri lato client. La cache key include un hash del body per collision detection. L'invalidazione è automatica quando vengono aggiornate risorse correlate.

---

## 8. Observability Stack Completo

### Differenza tra Monitoring, Telemetry e Observability

È fondamentale comprendere la distinzione tra questi tre concetti spesso confusi.

Monitoring è il processo di raccolta e visualizzazione di metriche predefinite per verificare che il sistema funzioni entro parametri noti. Risponde alla domanda "Il sistema sta funzionando?" tramite metriche come CPU usage, memoria, conteggio richieste.

Telemetry è la raccolta automatizzata di dati dal sistema: metriche, log, trace. È il meccanismo di trasporto dei dati, non l'analisi. OpenTelemetry standardizza questo processo.

Observability è la capacità di comprendere lo stato interno del sistema dalle sue output esterne. Risponde alla domanda "Perché il sistema si comporta così?" e permette di diagnosticare problemi mai visti prima correlando metriche, log e trace.

### Stack Completo

L'instrumentation layer utilizza OpenTelemetry SDK con auto-instrumentation per HTTP, Redis, PostgreSQL e RabbitMQ, più custom spans per business logic e API esterne.

L'OTEL Collector riceve, processa ed esporta i dati di telemetria, gestendo sampling, filtering e enrichment.

I dati confluiscono verso backend specializzati: Prometheus per metriche con counters, gauges e histograms; Loki per log strutturati con labels e full-text search; Tempo per trace con spans, context e sampling.

Grafana unifica la visualizzazione con dashboards, alerting e correlation UI.

### APM con SigNoz

SigNoz è una piattaforma APM open source native OpenTelemetry che fornisce un'alternativa a DataDog e NewRelic. Le sue caratteristiche principali includono service topology maps per visualizzare le dipendenze tra servizi, transaction tracing con metriche P99 e P95, analisi latenza database, RED metrics (Rate, Errors, Duration), Apdex scoring, flame graphs per analisi performance, exception tracking, e analisi query database.

Essendo OpenTelemetry native, non crea vendor lock-in. Il backend ClickHouse richiede il 50% di risorse in meno rispetto a Elastic durante l'ingestion.

### Error Tracking con GlitchTip

GlitchTip è una piattaforma open source compatibile con le SDK Sentry, fungendo da drop-in replacement. La sua architettura è semplificata rispetto a Sentry self-hosted, richiedendo solo 4 componenti (backend, worker, Redis, PostgreSQL) invece delle oltre dodici necessarie per Sentry.

Le funzionalità includono error grouping e deduping, stack traces con contesto, issue tracking e triage. La categorizzazione degli errori avviene per servizio, tipo errore (classe eccezione), utente/tenant, severity e environment.

Per la riproduzione dei bug, GlitchTip cattura stack trace completo, contesto della richiesta (headers, body, parametri), contesto utente (id, email, ruoli), breadcrumbs delle azioni precedenti, e variabili d'ambiente sanitizzate.

### Predizione Errori con Anomaly Detection

Per individuare in anticipo potenziali errori, il sistema utilizza alerting basato su anomaly detection. Gli alert predittivi includono rilevamento di error rate anomalo quando supera due deviazioni standard rispetto alla media giornaliera, trend di latenza database in aumento costante, e sospetto memory leak quando l'uso memoria cresce consistentemente nel tempo.

---

## 9. Sistema di Revisioni e Audit

### Analisi Comparativa Strategie

Event Sourcing presenta alta complessità ma fornisce audit trail completo by design. Le query point-in-time richiedono replay degli eventi. Per GDPR e diritto all'oblio richiede crypto-shredding. Lo storage cresce linearmente con gli eventi. Le performance in scrittura sono ottime essendo append-only, mentre in lettura richiedono proiezioni separate. Il caso d'uso ideale sono gli eventi clinici.

Temporal Tables hanno complessità media con versioning automatico. Le query point-in-time sono native nel database. GDPR è gestibile con delete diretto. Lo storage è 2-3 volte la tabella base. Le performance hanno overhead per trigger in scrittura ma query diretta in lettura. Il caso d'uso ideale sono le anagrafiche.

History Tables hanno bassa complessità con implementazione semplice. Le query point-in-time richiedono join con la tabella history. GDPR è gestibile con delete diretto. Lo storage è circa 2 volte la tabella base. Le performance hanno overhead trigger simile. Il caso d'uso ideale sono i dati amministrativi.

### Raccomandazione Ibrida

La raccomandazione è usare un approccio ibrido selezionando la strategia in base al tipo di entità e livello di compliance. Event sourcing per dati clinici critici come eventi clinici, prescrizioni e diagnosi. Temporal tables per anagrafiche come pazienti, operatori e organizzazioni. History tables per dati amministrativi come appuntamenti, notifiche e impostazioni.

### Soft Delete con Audit

Ogni entità supporta soft delete con audit trail. Invece di eliminare fisicamente i record, viene impostato un timestamp deleted_at e registrato chi ha effettuato la cancellazione. Contemporaneamente viene creata una entry nel log di audit con i dati originali, l'azione eseguita, e chi l'ha eseguita.

---

## 10. Collaborazione Real-Time e Offline

### Y.js per Conflict Resolution

Il sistema utilizza Y.js per editing collaborativo, implementando CRDTs (Conflict-free Replicated Data Types) che garantiscono convergenza automatica senza necessità di un server centrale per il merge. Questo approccio è simile a quello di Google Docs.

La sincronizzazione real-time avviene via WebSocket, mentre la persistenza locale tramite IndexedDB garantisce il supporto offline. L'awareness system tiene traccia degli utenti presenti sul documento con informazioni come id, nome e colore.

La struttura documento per healthcare include una mappa per il record paziente, testo per le note cliniche, e array per la lista medicazioni. Le transazioni con attribution permettono di tracciare chi ha fatto cosa per l'audit trail, registrando userId e reason per ogni modifica.

### Persistenza Y.js con Revision System

Gli update Y.js vengono persistiti nel sistema di revisioni per audit trail completo. Quando un documento viene richiesto, si carica l'ultimo stato dal revision service. Quando viene modificato, si salva come nuova revisione includendo il contenuto come stato binario Y.js, l'userId dal contesto, il timestamp e il tipo di update CRDT.

L'autenticazione verifica il JWT e i permessi di accesso al documento prima di permettere la connessione.

---

## 11. Servizio Calendari e Scheduling

### Pattern RFC-5545 per Eventi Ricorrenti

Il servizio calendari implementa lo standard iCalendar RFC-5545 per massima compatibilità con client calendar esterni.

Gli eventi calendario contengono informazioni base come titolo, descrizione e location; timing con data/ora inizio e fine, flag all-day e timezone; ricorrenza tramite RRULE nel formato standard come "FREQ=WEEKLY;BYDAY=MO,WE,FR;UNTIL=20251231"; eccezioni come date escluse dalla ricorrenza; organizzatore e partecipanti; risorse associate come paziente, stanza o attrezzatura; e stato tra tentative, confirmed e cancelled.

I partecipanti agli eventi hanno uno stato di risposta (accepted, declined, tentative, needs-action) e un ruolo (chair, required participant, optional participant).

Per query veloci sulle ricorrenze espanse, si utilizza una vista materializzata che genera tutte le occorrenze dalla RRULE escludendo le date in eccezione, con indice su tenant, data inizio e data fine.

### Constraint Satisfaction per Scheduling

Per scheduling complesso con vincoli come disponibilità, conflitti e requisiti risorse, il sistema implementa un solver. I vincoli sono classificati per tipo (availability, conflict, resource, preference) e peso da 0 a 1 dove 1 indica un hard constraint.

Il solver genera slot candidati nel range di date richiesto, valuta ogni slot rispetto a tutti i vincoli calcolando uno score, filtra solo gli slot che soddisfano almeno l'80% dei vincoli pesati, e ordina per score decrescente restituendo gli slot migliori.

---

## 12. Automazioni No-Code con n8n

### Integrazione n8n

n8n fornisce automazione workflow no-code con oltre 400 integrazioni, deployabile self-hosted per compliance. La configurazione prevede database PostgreSQL per persistenza, encryption key per i dati sensibili, e SSO con Keycloak tramite OIDC.

Le features enterprise includono on-premise completo, SSO SAML e LDAP, encrypted secret stores, version control, permessi RBAC avanzati, audit logs con streaming verso terze parti, workflow history, variabili custom, storage esterno, Git control, ambienti isolati, e workflow multi-utente.

### Workflow Templates per Healthcare

Un esempio di workflow è il reminder appuntamenti pazienti. Il trigger è schedulato per eseguire ogni 24 ore. Il primo step recupera gli appuntamenti del giorno successivo chiamando l'API del gateway. Poi filtra quelli non confermati. Per ciascuno invia un SMS di reminder al paziente. Infine logga l'operazione nell'audit trail.

### Casi d'Uso Automazioni

Per il dominio healthcare: reminder appuntamenti via SMS ed email, escalation ticket non risolti, report giornaliero attività, sync dati con sistemi esterni tramite HL7 FHIR, alert metriche vitali fuori range.

Per il dominio legal come esempio alternativo: scadenzario pratiche, notifiche udienza, generazione automatica documenti, sync con gestionale studio.

---

## 13. Reportistica e Gestione Documenti

### JSReport per Report Custom

JSReport genera report in PDF, Excel e Word da template HTML con Handlebars. Il servizio report permette di generare report paziente specificando formato PDF o XLSX. Il template viene processato con i dati del paziente inclusa la storia clinica, data generazione e utente che genera. Per i PDF è possibile configurare margini, header con nome paziente, e footer con numero pagina.

### PDF Portfolio con Firma Digitale

Il sistema di merge documenti PDF con validazione firme eIDAS permette di creare portfolio cronologici. Il processo ordina i documenti per data creazione, per ciascuno carica il contenuto da MinIO, se ha firme digitali le valida, copia le pagine nel documento merged, e aggiunge entry nell'outline per navigazione con bookmark.

La validazione firme verifica: validità del certificato, catena fino a root trusted, stato di revoca via OCSP/CRL, e validità del timestamp se presente. Gli standard supportati sono PAdES per firme embedded in PDF, CAdES per firme CMS/PKCS#7 su qualsiasi file, e XAdES per firme XML usate in documenti HL7 CDA.

---

## 14. Autenticazione e Autorizzazione

### Dual-User Architecture

Il sistema distingue tra System Users per l'infrastruttura e Domain Users per il business, come documentato in ADR-003.

I System Users risiedono nel realm master di Keycloak, includono account admin, service account e utenti DevOps, usano autenticazione JWT locale, e vengono creati manualmente.

I Domain Users risiedono nel realm healthcare-domain, includono medici, infermieri, pazienti e domain admin, usano autenticazione OIDC SSO, e vengono creati automaticamente tramite provisioning al primo login.

Il collegamento tra Domain User e Operator è opzionale e richiede validazione admin. Un operatore può esistere come anagrafica senza essere ancora linkato a un utente sistema.

### Flusso Autenticazione OIDC

Il flusso inizia quando il client richiede login al gateway. Il gateway genera PKCE code_verifier e state, li salva in Redis, e redirige il client verso Keycloak. L'utente effettua login su Keycloak che redirige al callback con authorization code. Il gateway riceve il code, lo scambia con Keycloak insieme al PKCE per ottenere access token e refresh token, crea la sessione in Redis, e imposta il cookie di sessione sul client.

### Session Manager con Sliding Window

Il sistema implementa un SessionManager custom invece di affidarsi alle sessioni native di Keycloak per garantire controllo granulare dell'esperienza utente e performance ottimali.

Le sessioni native Keycloak presentano limiti significativi per applicazioni enterprise: TTL fisso senza sliding window (la sessione scade dopo X minuti dal login, non dall'ultima attività), refresh token rigido (se scade richiede re-login anche se l'utente era attivo), nessun tracking attività real-time, nessuna auto-refresh proattiva (il client deve aspettare il 401), e overhead di latenza per validazione token su ogni richiesta.

Il SessionManager custom risolve questi problemi con le seguenti caratteristiche. Sliding window automatica che estende il TTL a ogni attività recente: se l'utente è attivo negli ultimi 5 minuti, il TTL viene resettato a 1 ora da adesso invece di scadere. Auto-refresh proattivo del token Keycloak: quando il token scade tra 5 minuti, il sistema chiama automaticamente l'endpoint refresh PRIMA che scada, evitando 401 all'utente. Activity tracking con timestamp lastActivity per audit trail e analytics. Performance ottimale con cache Redis locale che evita chiamate Keycloak a ogni richiesta. Cleanup automatico tramite job orario che rimuove sessioni abbandonate.

Il flusso operativo prevede che al login il gateway crei una sessione Redis con TTL di 1 ora contenente userId, accessToken, refreshToken ed expiresAt. Ad ogni richiesta, il SessionManager recupera la sessione da Redis, controlla se il token scade tra meno di 5 minuti e in caso positivo chiama Keycloak per refresh, verifica se l'attività è recente (ultimi 5 minuti) e in caso positivo estende il TTL a 1 ora, aggiorna lastActivity con timestamp corrente, e salva la sessione aggiornata in Redis.

Questo approccio garantisce che un medico che sta compilando una cartella clinica lunga non venga mai disconnesso per timeout, che i token vengano rinnovati trasparentemente senza mai mostrare 401 all'utente, che l'audit trail registri esattamente quando l'operatore era attivo, e che le performance siano ottimali con Redis locale invece di chiamate Keycloak.

### RBAC con Scope Gerarchico

I permessi possono essere limitati per scope organizzativo. La valutazione dei permessi recupera tutti i ruoli dell'operatore, per ogni ruolo verifica se ha il permesso richiesto, se il ruolo ha scope limitato verifica che la risorsa sia nello scope (stessa organizzazione, divisione o dipartimento), e infine verifica eventuali capabilities custom che possono fare override.

---

## 15. Feature List Completa

### Core Platform

Le feature implementate includono API Gateway con routing, load balancing e rate limiting; Service Mesh con comunicazione inter-service via Platformatic Watt; Authentication con OIDC Keycloak, JWT validation e PKCE; Authorization con RBAC, scope gerarchico e capabilities custom.

Nel backlog ci sono Multi-Tenancy con Row-Level Security e tenant isolation; Cache Dedupe con async-cache-dedupe per mutation requests; Circuit Breaker per resilienza chiamate esterne; Rate Limiting per protezione abuse per endpoint.

### Domain Services

Pianificati per il futuro: Operator Management con CRUD operatori, tipi e linking Keycloak; Organization Hierarchy con struttura Org/Div/Dept/Team; Permission Matrix con interfaccia admin MatrixPar; Calendar Service con RFC-5545, eventi ricorrenti e constraints; Collaboration con Y.js CRDT e editing real-time; Lock e Presence con Redis distributed locks e awareness; Revision System con event sourcing, temporal tables e audit.

### Document Management

Pianificati: Document Storage con MinIO S3-compatible; PDF Portfolio con merge cronologico e bookmarks; Signature Validation per PAdES/CAdES/XAdES secondo eIDAS; Report Generation con JSReport per PDF/Excel/Word.

### Observability

Implementati: Metrics con Prometheus e custom metrics; Logging strutturato JSON Loki-ready; Dashboards Grafana con alerting.

Pianificati: Tracing con OpenTelemetry e Tempo; APM con SigNoz e service topology; Error Tracking con GlitchTip Sentry-compatible.

### Automation

Pianificati: Workflow Automation con n8n self-hosted; Scheduled Jobs con cron triggers e webhook triggers; Integrations con 400+ connectors via n8n. Per il futuro AI Agents con LLM integration in workflows.

### Infrastructure

Implementati: Container Orchestration con Docker Compose e K8s-ready; Reverse Proxy con Caddy 2.x e TLS termination; CI/CD con Git hooks e semantic versioning; Security Scanning con secret detection e SAST.

---

## 16. Metriche di Affidabilità Enterprise

### SLA Targets

L'availability target è 99.9% corrispondente a 8.76 ore di downtime massimo annuo, misurato tramite uptime monitoring.

Per la latency, il target P50 è sotto i 100ms, P95 sotto i 300ms, P99 sotto i 500ms, misurati tramite histogram Prometheus.

L'error rate target è sotto lo 0.1%, calcolato come rapporto tra risposte 5xx e totale richieste.

Il Mean Time To Recovery target è sotto i 30 minuti, tracciato tramite incident tracking.

Il Mean Time Between Failures target è oltre 720 ore, anch'esso tracciato tramite incident tracking.

Il Recovery Point Objective è sotto 1 ora, verificato tramite backup verification.

Il Recovery Time Objective è sotto 4 ore, verificato tramite disaster recovery drill.

### Alerting

Gli alert critici che attivano PagerDuty includono error rate sopra l'1% per 5 minuti e servizio down per 1 minuto.

Gli alert warning che notificano su Slack includono latenza P95 sopra 500ms per 10 minuti e memory usage sopra 85% per 15 minuti.

---

## 17. Sezioni del Corso

Il corso si articola in 25 sezioni. La sezione 1 copre Linux e Shell in 4 ore con comandi base, filesystem e permissions. La sezione 2 tratta Git e Version Control in 4 ore con branching, trunk-based development e hooks. La sezione 3 introduce Docker Fundamentals in 4 ore con containers, Compose e networking.

La sezione 4 approfondisce Node.js Runtime in 4 ore con event loop, modules e async patterns. La sezione 5 è un deep dive su TypeScript in 4 ore con types, generics e strict mode. La sezione 6 copre Fastify Framework in 6 ore con plugins, hooks e validation.

La sezione 7 tratta Observability in 6 ore con Prometheus, Loki, Tempo e Grafana. La sezione 8 copre Code Patterns in 4 ore con SOLID, clean code e design patterns. La sezione 9 approfondisce Redis e RabbitMQ in 6 ore con caching, pub/sub e queues.

La sezione 10 tratta MinIO e Documents in 4 ore con S3 API e PDF handling. La sezione 11 copre Authentication in 6 ore con OAuth, OIDC, Keycloak e RBAC.

Le sezioni 12-16 riguardano la UI: Login in 4 ore con PKCE flow e token handling; CRUD in 4 ore con forms, validation e optimistic updates; Lists in 4 ore con pagination, filtering e search; Permissions in 4 ore con guards e feature flags; State in 4 ore con state management e offline.

La sezione 17 copre Networking in 4 ore con DNS, TLS e reverse proxy. La sezione 18 tratta Security in 4 ore con OWASP, secrets e scanning. La sezione 19 approfondisce Testing in 6 ore con unit, integration, E2E e BDD. La sezione 20 copre CI/CD in 4 ore con pipelines e deployments.

La sezione 21 introduce Healthcare Protocols in 4 ore con HL7, FHIR e DICOM basics. La sezione 22 tratta Production Deploy in 4 ore con Hetzner, monitoring e runbooks. La sezione 23 copre Collaboration in 4 ore con Y.js, CRDTs e real-time. La sezione 24 approfondisce Advanced Patterns in 4 ore con event sourcing e CQRS. La sezione 25 conclude con AI Integration in 4 ore con LLM APIs e AI-assisted development.

---

## 18. Integrazione AI nel Progetto

### AI come Copilota di Sviluppo

Il corso e il progetto integrano AI a più livelli.

Per lo sviluppo assistito si utilizzano GitHub Copilot e Cursor per code completion, Claude e ChatGPT per design decisions e debugging, e AI review dei pull request.

Per automazioni intelligenti tramite n8n: classificazione automatica ticket, suggerimenti diagnosi con supervisione medica, generazione summary appuntamenti.

Per observability aumentata: anomaly detection su metriche, root cause analysis suggerita, predictive alerting.

### Flusso AI nel Corso

Nella fase di sviluppo, il design viene assistito da Claude, il coding da Copilot, e il review è ibrido AI più human.

Nella fase runtime, l'anomaly detection tramite ML genera alert che vengono processati da LLM per suggerire azioni.

Nella fase automation con n8n, eventi trigger attivano AI agent processing via LLM che poi esegue le azioni risultanti.

---

## 19. Roadmap e Backlog

### Short-term Q4 2025

Le user story pianificate includono US-040 per enhanced session management con token refresh, US-041 per TypeBox schemas validation, US-042 per auth plugin composition unificando JWT e Keycloak, US-045 per Circuit Breaker implementation, US-046 per Rate Limiting per endpoint, US-047 per configurazione CORS.

### Mid-term Q1 2026

Le attività pianificate includono ADR-006 per multi-tenant architecture con RLS, ADR-007 per ORM selection tra Kysely e Prisma, ADR-008 per frontend architecture, implementazione Operator Service, implementazione Calendar Service, e Y.js Collaboration Service.

### Long-term Q2 2026

Le attività future includono integrazione SigNoz APM, GlitchTip error tracking, n8n automation workflows, JSReport reporting service, PDF portfolio con signature validation, production deployment con Ansible, e healthcare compliance audit per HIPAA e GDPR.

---

## 20. Esempio: Configurazione Dominio Legal

Per dimostrare la flessibilità del sistema, ecco come configurare la piattaforma per uno studio legale.

### Tipi Operatore Legal

Il tipo partner ha capabilities complete su casi, clienti, billing, report e gestione utenti. Il tipo associate può leggere e scrivere casi, leggere clienti, e gestire documenti. Il tipo paralegal può leggere casi, leggere e scrivere documenti, e gestire calendario. Il tipo secretary può gestire calendario e leggere clienti e documenti. Il tipo client può leggere i propri dati, i propri casi, i propri documenti e le proprie fatture.

### Struttura Organizzativa Legal

Lo Studio Legale Rossi e Associati come organizzazione contiene la divisione Contenzioso con dipartimenti Civile (che ha il team Societario) e Penale (che ha il team White Collar), la divisione Consulenza con dipartimenti M&A e Tax, e la divisione Amministrazione con dipartimenti Billing e HR.

### Workflow n8n per Legal

Un workflow esempio è il Case Deadline Monitor che monitora le scadenze pratiche e invia alert. Il trigger giornaliero attiva il recupero delle scadenze nei prossimi 7 giorni, poi raggruppa per urgenza, invia email al responsabile con oggetto che indica la pratica e testo che specifica numero pratica e data scadenza.

### Report JSReport per Legal

Un template di report per riepilogo pratica include header con titolo pratica e numero, sezione riepilogo con stato, valore e responsabile, sezione timeline attività con data, descrizione e autore per ciascuna, e sezione documenti allegati con titolo, tipo e data upload per ciascuno.

Questo esempio dimostra come la stessa piattaforma, con configurazioni diverse, supporti domini completamente differenti mantenendo la stessa architettura core.

---

## 21. Risorse e Riferimenti

### Documentazione Ufficiale

Le risorse principali includono Platformatic Documentation su docs.platformatic.dev, Fastify Documentation su fastify.dev/docs, Keycloak Documentation su keycloak.org/documentation, OpenTelemetry Documentation su opentelemetry.io/docs, Y.js Documentation su docs.yjs.dev, e n8n Documentation su docs.n8n.io.

### ADRs del Progetto

ADR-001 Minimal Infrastructure secondo principio YAGNI è stato accettato. ADR-003 User Management con Dual Architecture è stato accettato. ADR-004 CI/CD Pipeline è pianificato. ADR-006 Multi-Tenant Strategy è pianificato. ADR-007 ORM Selection è pianificato. ADR-008 Frontend Architecture è pianificato.

### Repository e Endpoints

Il repository è tech-citizen-sw-gateway.

Gli endpoints di sviluppo sono: Gateway su <https://localhost:18443>, Keycloak Admin su <http://localhost:8090/admin>, Prometheus su <http://localhost:19090>, Grafana su <http://localhost:3000> con credenziali admin/admin, n8n su <http://localhost:5678>, SigNoz su <http://localhost:3301>, GlitchTip su <http://localhost:8100>.

---

**Maintainer**: Antonio Cittadino  
**Ultimo Review**: Dicembre 2025  
**Prossimo Review**: Gennaio 2026

---

_Questo documento è generato come parte del corso "Modern Backend Development with AI" e viene aggiornato continuamente con l'evoluzione del progetto._
