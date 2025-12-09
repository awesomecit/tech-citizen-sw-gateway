Feature: Keycloak User Management Integration
  As a developer
  I want to manage users in Keycloak programmatically
  So that I can handle registration, login, and user lifecycle

  Background:
    Given Keycloak is running at "http://localhost:8080"
    And realm "techcitizen" exists
    And I have admin credentials for Keycloak
    And the auth package keycloak plugin is registered

  Scenario: Create new user successfully
    Given no user exists with email "newuser@example.com"
    When I call keycloak.createUser with:
      | field    | value                |
      | email    | newuser@example.com  |
      | password | SecureP@ss123        |
      | enabled  | true                 |
    Then the user is created in Keycloak
    And the user ID is returned
    And the user can login with credentials "newuser@example.com" and "SecureP@ss123"
    And the user's email is verified

  Scenario: Attempt to create duplicate user
    Given a user exists with email "existing@example.com"
    When I call keycloak.createUser with:
      | field    | value                  |
      | email    | existing@example.com   |
      | password | AnotherP@ss456         |
    Then an error is thrown
    And error code is "USER_EXISTS"
    And error message contains "User with email existing@example.com already exists"
    And the original user remains unchanged

  Scenario: Find user by email
    Given a user exists with:
      | field    | value                |
      | email    | findme@example.com   |
      | userId   | user-456             |
      | username | findme               |
    When I call keycloak.findUserByEmail("findme@example.com")
    Then the user object is returned
    And user.id equals "user-456"
    And user.email equals "findme@example.com"
    And user.username equals "findme"

  Scenario: Find non-existent user returns null
    Given no user exists with email "ghost@example.com"
    When I call keycloak.findUserByEmail("ghost@example.com")
    Then null is returned
    And no error is thrown

  Scenario: Update user password
    Given a user exists with email "resetme@example.com" and password "OldP@ss123"
    When I call keycloak.updatePassword("resetme@example.com", "NewP@ss456")
    Then the password is updated successfully
    And the user cannot login with password "OldP@ss123"
    And the user can login with password "NewP@ss456"

  Scenario: Delete user
    Given a user exists with email "deleteme@example.com"
    When I call keycloak.deleteUser("deleteme@example.com")
    Then the user is removed from Keycloak
    And subsequent findUserByEmail returns null
    And the user cannot login

  Scenario: Keycloak connection failure with retry
    Given Keycloak container is stopped
    When I call keycloak.createUser with any data
    Then the plugin retries 3 times
    And each retry has exponential backoff (1s, 2s, 4s)
    And after 3 retries, error is thrown
    And error code is "SERVICE_UNAVAILABLE"
    And error message contains "Keycloak is unavailable after 3 retries"

  Scenario: Keycloak authentication failure (invalid credentials)
    Given Keycloak is running
    But admin credentials are invalid
    When I initialize the keycloak plugin
    Then an error is thrown
    And error code is "AUTH_FAILED"
    And error message contains "Invalid admin credentials for Keycloak"

  Scenario: Create user with custom attributes
    Given no user exists with email "custom@example.com"
    When I call keycloak.createUser with:
      | field              | value                |
      | email              | custom@example.com   |
      | password           | SecureP@ss123        |
      | attributes.role    | patient              |
      | attributes.clinic  | clinic-789           |
    Then the user is created with custom attributes
    And user.attributes.role equals ["patient"]
    And user.attributes.clinic equals ["clinic-789"]
