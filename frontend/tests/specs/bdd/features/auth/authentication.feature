@auth @e2e
Feature: Authentication Flows
  As a user
  I want to authenticate securely
  So that I can access protected features

  Background:
    Given I am on the authentication page

  @login
  Scenario: Login with valid credentials
    When I enter a valid email and password
    And I submit the login form
    Then I should be authenticated
    And I should be redirected to the home page

  @login @validation
  Scenario: Login with invalid email format
    When I enter an invalid email
    And I submit the login form
    Then I should see an email validation error

  @registration
  Scenario: Register with valid credentials
    When I navigate to the registration form
    And I enter valid registration details
    And I submit the registration form
    Then I should see a registration success state

  @logout
  Scenario: Logout after login
    Given I am authenticated
    When I log out
    Then I should be unauthenticated
