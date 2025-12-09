Feature: JWT Validation Plugin
  As a developer
  I want to validate JWT tokens from Keycloak
  So that only authenticated users access protected resources

  Background:
    Given Keycloak is running at "http://localhost:8080"
    And realm "techcitizen" exists with public key
    And the auth package is registered in a Fastify app

  Scenario: Valid JWT token authentication
    Given a valid JWT signed by Keycloak with:
      | field  | value                |
      | sub    | user-123             |
      | email  | test@example.com     |
      | exp    | 2025-12-10T00:00:00Z |
      | iss    | http://localhost:8080/realms/techcitizen |
    When I call fastify.authenticate(request, reply)
    Then the authentication succeeds
    And request.user.sub equals "user-123"
    And request.user.email equals "test@example.com"
    And no error is thrown

  Scenario: Expired JWT token
    Given a JWT signed by Keycloak with:
      | field  | value                |
      | sub    | user-123             |
      | exp    | 2025-12-08T00:00:00Z |
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error type is "TokenExpiredError"
    And error message contains "jwt expired"

  Scenario: Invalid JWT signature
    Given a JWT with tampered signature
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error type is "JsonWebTokenError"
    And error message contains "invalid signature"

  Scenario: Missing JWT token
    Given no Authorization header in request
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error message contains "No Authorization was found in request.headers"

  Scenario: Malformed JWT token
    Given Authorization header "Bearer not-a-valid-jwt"
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error type is "JsonWebTokenError"
    And error message contains "jwt malformed"

  Scenario: Wrong issuer in JWT
    Given a valid JWT signed by different issuer:
      | field  | value                |
      | iss    | http://evil.com/realms/fake |
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error message contains "invalid issuer"

  Scenario: JWT with missing required claims
    Given a JWT missing the "sub" claim
    When I call fastify.authenticate(request, reply)
    Then the authentication fails
    And reply status is 401
    And error message contains "missing required claim: sub"
