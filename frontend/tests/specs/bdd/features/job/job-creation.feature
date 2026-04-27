@job @e2e
Feature: Job Creation Flow
  As a hub owner
  I want to create a job posting
  So that I can find experts for work

  Background:
    Given I am authenticated as a hub owner
    And I navigate to the job creation flow

  @complete-flow
  Scenario: Create a job with required fields
    When I fill the job overview with:
      | title | category | serviceType | employmentType | location | expertLevel |
      | Test Job | Technology | Consulting | Contract | Remote | Senior |
    And I go to the next step
    And I fill the job requirements with:
      | description | skills | qualifications |
      | Test job description | JavaScript,TypeScript,Angular | 5+ years |
    And I go to the next step
    And I fill the job timeline and budget with:
      | timeline | budgetType | currency | amount |
      | 3 months | Fixed | USD | 10000 |
    And I go to the next step
    And I fill the job client details with:
      | clientName | organizationDetails | aboutOrganization |
      | Test Client | Test Org | Test organization details |
    And I go to the next step
    Then I should see the job confirmation page

  @validation
  Scenario: Validate required fields in overview
    When I attempt to continue without filling job overview required fields
    Then I should see validation errors on the job overview step
