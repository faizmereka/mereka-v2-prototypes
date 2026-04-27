@expertise @e2e
Feature: Expertise Creation Flow
  As an expert
  I want to create an expertise listing
  So that I can showcase my skills

  Background:
    Given I am authenticated as an expert
    And I navigate to the expertise creation flow

  @complete-flow
  Scenario: Create expertise with required fields
    When I fill the expertise basic info with:
      | title | category |
      | Test Expertise | Technology |
    And I proceed to the next step
    Then I should see the expertise confirmation page
