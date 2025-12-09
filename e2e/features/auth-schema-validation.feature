Feature: TypeBox Schema Validation for Auth Requests
  As a developer
  I want to validate authentication requests with TypeBox schemas
  So that invalid data is rejected before reaching business logic

  Background:
    Given TypeBox schemas are compiled with TypeCompiler
    And RegisterUserSchema requires:
      | field    | rule                                      |
      | email    | string, format email                      |
      | password | string, minLength 8, pattern (1 upper, 1 number) |
    And LoginUserSchema requires:
      | field    | rule                |
      | email    | string, format email |
      | password | string, minLength 1  |

  Scenario: Valid registration data passes validation
    Given RegisterUserSchema compiled validator
    When I validate the following data:
      """json
      {
        "email": "test@example.com",
        "password": "SecureP@ss1"
      }
      """
    Then validation passes
    And TypeScript infers type RegisterUser
    And no errors are returned

  Scenario: Invalid email format fails validation
    Given RegisterUserSchema compiled validator
    When I validate the following data:
      """json
      {
        "email": "not-an-email",
        "password": "SecureP@ss1"
      }
      """
    Then validation fails
    And error path is "/email"
    And error message is "must match format \"email\""

  Scenario: Password too short fails validation
    Given RegisterUserSchema compiled validator
    When I validate the following data:
      """json
      {
        "email": "test@example.com",
        "password": "Short1"
      }
      """
    Then validation fails
    And error path is "/password"
    And error message contains "must NOT have fewer than 8 characters"

  Scenario: Password missing uppercase letter fails validation
    Given RegisterUserSchema with password pattern /(?=.*[A-Z])(?=.*\d)/
    When I validate the following data:
      """json
      {
        "email": "test@example.com",
        "password": "lowercase123"
      }
      """
    Then validation fails
    And error path is "/password"
    And error message contains "must match pattern"

  Scenario: Password missing number fails validation
    Given RegisterUserSchema with password pattern /(?=.*[A-Z])(?=.*\d)/
    When I validate the following data:
      """json
      {
        "email": "test@example.com",
        "password": "NoNumbersHere"
      }
      """
    Then validation fails
    And error path is "/password"
    And error message contains "must match pattern"

  Scenario: Missing required field fails validation
    Given RegisterUserSchema compiled validator
    When I validate the following data:
      """json
      {
        "email": "test@example.com"
      }
      """
    Then validation fails
    And error path is ""
    And error message is "must have required property 'password'"

  Scenario: Extra fields are ignored (additionalProperties: false)
    Given RegisterUserSchema with additionalProperties: false
    When I validate the following data:
      """json
      {
        "email": "test@example.com",
        "password": "SecureP@ss1",
        "extraField": "should be ignored"
      }
      """
    Then validation fails
    And error message contains "must NOT have additional properties"

  Scenario: Valid login data passes validation
    Given LoginUserSchema compiled validator
    When I validate the following data:
      """json
      {
        "email": "user@example.com",
        "password": "anypassword"
      }
      """
    Then validation passes
    And TypeScript infers type LoginUser

  Scenario: Token response schema validation
    Given TokenResponseSchema requires:
      | field         | rule                        |
      | accessToken   | string, minLength 1         |
      | refreshToken  | string, minLength 1         |
      | expiresIn     | number, minimum 0           |
      | tokenType     | string, const "Bearer"      |
    When I validate the following token response:
      """json
      {
        "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "refreshToken": "refresh-token-xyz",
        "expiresIn": 300,
        "tokenType": "Bearer"
      }
      """
    Then validation passes
    And TypeScript infers type TokenResponse

  Scenario: Invalid token type fails validation
    Given TokenResponseSchema with tokenType const "Bearer"
    When I validate token response with tokenType "Basic"
    Then validation fails
    And error path is "/tokenType"
    And error message is "must be equal to constant"

  Scenario: Performance test - compiled validator is fast
    Given RegisterUserSchema compiled with TypeCompiler
    When I validate 1000 requests with valid data
    Then total time is less than 10 milliseconds
    And average time per validation is less than 0.01ms
    And performance is 10-100x faster than class-validator

  Scenario: OpenAPI schema generation from TypeBox
    Given RegisterUserSchema defined with TypeBox
    When I generate OpenAPI schema using Type.Strict()
    Then OpenAPI schema is generated automatically
    And schema includes:
      """json
      {
        "type": "object",
        "required": ["email", "password"],
        "properties": {
          "email": { "type": "string", "format": "email" },
          "password": { "type": "string", "minLength": 8 }
        }
      }
      """
    And schema can be used in Fastify route schema
    And Swagger UI shows correct validation rules
