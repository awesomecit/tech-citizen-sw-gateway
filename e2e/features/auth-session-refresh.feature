# language: it
Funzionalità: Refresh automatico token e gestione sessione

  Come utente autenticato
  Voglio che il sistema rinnovi automaticamente i miei token
  Per mantenere la sessione attiva senza re-login

  Contesto:
    Dato che il gateway è in esecuzione
    E che l'utente ha effettuato login
    E che la sessione è attiva

  Scenario: Token refresh automatico quando in scadenza
    Dato che il token scade tra 4 minuti
    Quando l'utente accede a "/api/protected"
    Allora il sistema effettua refresh del token automaticamente
    E la richiesta ha successo
    E la sessione viene aggiornata con il nuovo token

  Scenario: Estensione TTL sessione con sliding window
    Dato che la sessione ha TTL 30 minuti
    E che l'ultimo accesso è avvenuto 2 minuti fa
    Quando l'utente accede a "/api/protected"
    Allora il TTL della sessione viene esteso a 30 minuti
    E l'ultimo accesso viene aggiornato

  Scenario: Sessione scaduta
    Dato che la sessione è scaduta
    Quando l'utente accede a "/api/protected"
    Allora la richiesta fallisce
    E riceve status 401
    E riceve messaggio "Session expired"
    E la sessione viene rimossa da Redis

  Scenario: Refresh token invalido
    Dato che il refresh token è scaduto
    Quando l'utente accede a "/api/protected"
    Allora il sistema tenta il refresh
    E il refresh fallisce
    E riceve status 401
    E riceve messaggio "Token refresh failed"
    E la sessione viene invalidata

  Scenario: Logout utente
    Dato che l'utente ha una sessione attiva
    Quando l'utente effettua logout
    Allora il logout ha successo
    E la sessione viene rimossa da Redis
    E i token vengono invalidati
    E tentativi successivi di accesso falliscono
