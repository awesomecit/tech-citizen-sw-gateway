Feature: Auth Plugin Registration and Configuration
  As a developer
  I want to register the auth plugin in Fastify apps
  So that I can reuse authentication logic across services

  Background:
    Given a Fastify instance is created
    And Keycloak is running at "http://localhost:8080"
    And Redis is running at "redis://localhost:6379"

  Scenario: Register plugin with routes enabled (auth-api mode)
    Given a Fastify app for auth-api service
    When I register @tech-citizen/auth plugin with options:
      """json
      {
        "keycloakUrl": "http://localhost:8080",
        "realm": "techcitizen",
        "clientId": "auth-api",
        "clientSecret": "secret-123",
        "redisUrl": "redis://localhost:6379",
        "enableRoutes": true
      }
      """
    Then the plugin registers successfully
    And route POST /auth/register exists
    And route POST /auth/login exists
    And route POST /auth/logout exists
    And route POST /auth/refresh exists
    And route GET /auth/me exists
    And decorator "authenticate" is available
    And decorator "keycloak" is available
    And decorator "session" is available

  Scenario: Register plugin without routes (gateway mode)
    Given a Fastify app for gateway service
    When I register @tech-citizen/auth plugin with options:
      """json
      {
        "keycloakUrl": "http://localhost:8080",
        "realm": "techcitizen",
        "clientId": "gateway",
        "clientSecret": "secret-456",
        "redisUrl": "redis://localhost:6379",
        "enableRoutes": false
      }
      """
    Then the plugin registers successfully
    And NO routes under /auth/* exist
    And decorator "authenticate" is available
    And decorator "keycloak" is available
    And decorator "session" is available

  Scenario: Use authenticate decorator in protected route
    Given the auth plugin is registered in gateway
    And a route is defined:
      """typescript
      fastify.get('/api/profile', {
        onRequest: [fastify.authenticate]
      }, async (request) => {
        return { user: request.user };
      });
      """
    When I call GET /api/profile without Authorization header
    Then response status is 401
    When I call GET /api/profile with valid JWT
    Then response status is 200
    And response body includes user data from JWT

  Scenario: Missing required option - keycloakUrl
    Given a Fastify instance
    When I register plugin without keycloakUrl:
      """json
      {
        "realm": "techcitizen",
        "clientId": "gateway"
      }
      """
    Then plugin throws error
    And error message is "Missing required option: keycloakUrl"

  Scenario: Missing required option - realm
    Given a Fastify instance
    When I register plugin without realm:
      """json
      {
        "keycloakUrl": "http://localhost:8080",
        "clientId": "gateway"
      }
      """
    Then plugin throws error
    And error message is "Missing required option: realm"

  Scenario: Optional Redis URL defaults to in-memory storage
    Given a Fastify instance
    When I register plugin without redisUrl:
      """json
      {
        "keycloakUrl": "http://localhost:8080",
        "realm": "techcitizen",
        "clientId": "gateway",
        "enableRoutes": false
      }
      """
    Then plugin registers successfully
    And session storage uses in-memory Map (warning logged)
    And session.validateRefreshToken still works
    But sessions are NOT persisted across restarts

  Scenario: Plugin name and version metadata
    Given the auth plugin is registered
    When I inspect registered plugins
    Then plugin name is "@tech-citizen/auth"
    And plugin fastify version is "5.x"
    And plugin is wrapped with fastify-plugin

  Scenario: Multiple services register same plugin independently
    Given auth-api service registers plugin with enableRoutes=true
    And gateway service registers plugin with enableRoutes=false
    And patient-api service registers plugin with enableRoutes=false
    When all services start in Platformatic Watt
    Then each service has independent plugin instance
    And auth-api exposes /auth/* routes
    And gateway and patient-api do NOT expose /auth/* routes
    And all services can validate JWT tokens independently

  Scenario: Plugin provides TypeBox schemas for external use
    Given the auth plugin is registered
    When I import schemas from "@tech-citizen/auth":
      """typescript
      import { RegisterUserSchema, LoginUserSchema, TokenResponseSchema } from '@tech-citizen/auth';
      """
    Then schemas are available for reuse
    And I can use schemas in custom routes
    And schemas are already compiled with TypeCompiler

  Scenario: Plugin initialization with Keycloak unavailable
    Given Keycloak container is stopped
    When I register the auth plugin
    Then plugin initialization fails after retries
    And error code is "KEYCLOAK_UNAVAILABLE"
    And error message contains "Cannot connect to Keycloak"
    And Fastify app does not start

  Scenario: Hot reload support in development
    Given Platformatic Watt is running in dev mode
    And auth plugin is registered in auth-api
    When I modify packages/auth/src/plugins/jwt.ts
    Then Watt detects file change
    And auth-api service restarts
    And plugin is re-registered with new code
    And no manual restart is needed
