Feature: Session Management with Refresh Tokens
  As a security engineer
  I want to manage user sessions with refresh token rotation
  So that I can prevent token theft and enable secure logout

  Background:
    Given Redis is running at "redis://localhost:6379"
    And the auth package session plugin is registered
    And Keycloak is configured with:
      | setting           | value         |
      | accessTokenTTL    | 300 seconds   |
      | refreshTokenTTL   | 86400 seconds |

  Scenario: Store refresh token successfully
    Given a valid refresh token with:
      | field      | value                            |
      | userId     | user-123                         |
      | tokenId    | refresh-abc-456                  |
      | exp        | 2025-12-10T00:00:00Z (24h later) |
    When I call session.storeRefreshToken(token, "user-123")
    Then the token is stored in Redis
    And Redis key is "refresh:user-123:refresh-abc-456"
    And TTL equals 86400 seconds (24 hours)
    And subsequent session.validateRefreshToken(token) returns true

  Scenario: Validate active refresh token
    Given a refresh token stored in Redis with userId "user-123"
    When I call session.validateRefreshToken(token)
    Then validation returns true
    And token data includes userId "user-123"

  Scenario: Validate non-existent refresh token
    Given no refresh token exists in Redis
    When I call session.validateRefreshToken("non-existent-token")
    Then validation returns false
    And no error is thrown

  Scenario: Revoke refresh token (logout)
    Given an active refresh token with:
      | field      | value           |
      | userId     | user-123        |
      | tokenId    | refresh-xyz-789 |
      | exp        | 24h from now    |
    When I call session.revokeToken(token)
    Then the token is added to blacklist
    And Redis key "blacklist:refresh-xyz-789" is created
    And blacklist entry TTL equals token exp - current time
    And subsequent session.validateRefreshToken(token) returns false
    And the original refresh token key is deleted

  Scenario: Rotate tokens (refresh endpoint)
    Given a valid refresh token with userId "user-123"
    When I call session.rotateTokens(oldRefreshToken)
    Then a new access token is generated
    And a new refresh token is generated
    And the old refresh token is revoked (added to blacklist)
    And the new refresh token is stored in Redis
    And the new access token expires in 5 minutes
    And the new refresh token expires in 24 hours

  Scenario: Attempt to use revoked token
    Given a refresh token that was revoked 1 hour ago
    When I call session.validateRefreshToken(revokedToken)
    Then validation returns false
    And error message is "Token has been revoked"

  Scenario: Token blacklist cleanup after expiration
    Given a revoked token with exp = 1 hour ago
    And the token was added to blacklist when revoked
    When Redis TTL expires (1 hour passes)
    Then the blacklist entry is automatically deleted by Redis
    And no manual cleanup is required

  Scenario: Concurrent token rotation prevention
    Given a valid refresh token with userId "user-123"
    When two requests call session.rotateTokens(sameToken) simultaneously
    Then only one rotation succeeds
    And the other request receives error "TOKEN_ALREADY_ROTATED"
    And only one new refresh token exists in Redis

  Scenario: Redis connection failure handling
    Given Redis container is stopped
    When I call session.storeRefreshToken(token, userId)
    Then the operation retries 3 times
    And after retries, error is thrown
    And error code is "REDIS_UNAVAILABLE"

  Scenario: Store multiple refresh tokens for same user (multi-device)
    Given user "user-123" has no active tokens
    When I store refresh token A with tokenId "token-A"
    And I store refresh token B with tokenId "token-B"
    Then both tokens exist in Redis:
      | key                           |
      | refresh:user-123:token-A      |
      | refresh:user-123:token-B      |
    And both tokens can be validated independently

  Scenario: Revoke all user sessions (logout from all devices)
    Given user "user-123" has 3 active refresh tokens
    When I call session.revokeAllUserTokens("user-123")
    Then all 3 tokens are added to blacklist
    And all 3 original refresh token keys are deleted
    And subsequent validation of any token returns false
