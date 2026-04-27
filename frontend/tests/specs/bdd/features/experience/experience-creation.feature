@experience @platform @e2e
Feature: Platform Experience Creation
  As a hub owner
  I want to create a platform experience through a multi-step wizard
  So that I can offer services to learners

  Background:
    Given I am authenticated as a hub owner
    And I navigate to the experience creation flow

  @complete-flow
  Scenario: Create complete platform experience with required fields
    When I fill the basic info with:
      | title | slug | category | type |
      | Test Experience | test-exp | Workshop | Virtual |
    And I go to the next step
    And I fill the audience info with:
      | access | targetAudience | expertise | primaryLanguage |
      | Everyone | Open to Everyone | Beginner | English |
    And I go to the next step
    And I fill the booking info with:
      | durationHours | durationMinutes | timezone |
      | 1 | 30 | Malaysia (GMT+8) |
    And I go to the next step
    And I fill the tickets info with:
      | serviceFee | ticketType | ticketName | ticketQuantity |
      | No, users will bear the service fee | Free | General | 10 |
    And I go to the next step
    And I fill the page info with:
      | description |
      | This is a sample experience description for testing. |
    And I go to the next step
    And I fill the details info with:
      | learningOutcomes | instructions |
      | Learn core skills | Follow the instructions |
    And I go to the next step
    Then I should see the confirmation page

  @validation
  Scenario: Validate required fields in basic info
    When I attempt to continue without filling required fields
    Then I should see validation errors on the basic info step
