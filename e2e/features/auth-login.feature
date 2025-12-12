# language: it
Funzionalità: Login e gestione sessioni utente

  Come utente del sistema
  Voglio autenticarmi tramite Keycloak
  Per accedere alle risorse protette

  Contesto:
    Dato che il gateway è in esecuzione
    E che Keycloak è configurato con realm "test"
    E che esiste un utente "testuser" con password "testpass"

  Scenario: Login con credenziali valide
    Quando l'utente effettua login con username "testuser" e password "testpass"
    Allora il login ha successo
    E riceve un access token valido
    E riceve un refresh token valido
    E la sessione viene salvata in Redis

  Scenario: Login con credenziali invalide
    Quando l'utente effettua login con username "testuser" e password "wrong"
    Allora il login fallisce
    E riceve un errore 401
    E non viene creata alcuna sessione

  Scenario: Accesso a risorsa protetta con token valido
    Dato che l'utente ha effettuato login
    Quando l'utente accede a "/api/protected" con il token
    Allora la richiesta ha successo
    E riceve status 200

  Scenario: Accesso a risorsa protetta senza token
    Quando l'utente accede a "/api/protected" senza token
    Allora la richiesta fallisce
    E riceve status 401
    E riceve messaggio "Missing or invalid token"
