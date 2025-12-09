Feature: Keycloak OIDC Authentication (US-039)

  As a healthcare application
  I want to authenticate users via Keycloak OIDC
  So that users can login with SSO and auto-provision on first access

  Background:
    Given Keycloak is running on "http://localhost:8080"
    And realm "healthcare-domain" exists
    And OIDC client "gateway-client" is configured
    And client secret is set in environment variables

  Scenario: User logs in via OIDC for the first time (auto-provisioning)
    Given user "john.doe@example.com" does not exist in Keycloak
    When user navigates to "/auth/login"
    Then user is redirected to Keycloak login page
    When user enters valid credentials
    And user completes authentication
    Then user is created in Keycloak with attribute "user_type=domain"
    And user is redirected to "/auth/callback" with authorization code
    And authorization code is exchanged for tokens
    And session is created in Redis with "requestId"
    And user is redirected to dashboard

  Scenario: User logs in via OIDC (existing user)
    Given user "jane.smith@example.com" exists in Keycloak
    When user navigates to "/auth/login"
    Then user is redirected to Keycloak login page
    When user enters valid credentials
    Then authorization code is returned to "/auth/callback"
    And tokens are exchanged and validated
    And session is created with user attributes
    And user is redirected to dashboard

  Scenario: OIDC callback receives valid authorization code
    Given a valid authorization code from Keycloak
    When the code is sent to "/auth/callback?code=VALID_CODE&state=STATE_TOKEN"
    Then the gateway exchanges code for tokens
    And access_token is validated (signature, expiration, issuer)
    And refresh_token is stored securely
    And session cookie is set with httpOnly and secure flags
    And user is redirected to "/"

  Scenario: OIDC callback receives invalid authorization code
    Given an invalid authorization code
    When the code is sent to "/auth/callback?code=INVALID_CODE"
    Then the response status is 401
    And error message is "Invalid authorization code"
    And user is redirected to "/auth/login?error=invalid_code"

  Scenario: User logs out (session destruction)
    Given user is authenticated with session ID "abc123"
    When user requests "/auth/logout"
    Then session "abc123" is deleted from Redis
    And user is redirected to Keycloak logout endpoint
    And Keycloak invalidates tokens
    And user is redirected to "/"

  Scenario: Access protected route without session
    Given user is not authenticated
    When user requests "/api/protected-resource"
    Then the response status is 401
    And error message is "Authentication required"
    And user is redirected to "/auth/login"

  Scenario: Access protected route with valid session
    Given user is authenticated with session ID "xyz789"
    And session "xyz789" exists in Redis
    When user requests "/api/protected-resource"
    Then the request includes session data in context
    And the response status is 200

  Scenario: Token refresh when access_token expires
    Given user has expired access_token
    And user has valid refresh_token
    When the gateway detects token expiration
    Then refresh_token is sent to Keycloak "/token" endpoint
    And new access_token and refresh_token are received
    And session is updated with new tokens
    And request proceeds with new access_token

  Scenario: Session expires (Redis TTL exceeded)
    Given user has session ID "expired123"
    And session TTL has expired in Redis
    When user requests protected route
    Then session is not found in Redis
    And user is redirected to "/auth/login"
    And error message is "Session expired, please login again"

  Scenario: Validate JWT issuer matches Keycloak realm
    Given access_token has issuer "http://keycloak:8080/realms/WRONG_REALM"
    When token is validated
    Then validation fails with "Invalid issuer"
    And user is logged out

  Scenario: Validate required claims in JWT (email, sub)
    Given access_token is missing "email" claim
    When token is validated
    Then validation fails with "Missing required claim: email"
    And session creation is aborted
