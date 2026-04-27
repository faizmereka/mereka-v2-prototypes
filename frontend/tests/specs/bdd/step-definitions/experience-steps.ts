import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { DataTable } from '@cucumber/cucumber';
import type { TestContext } from '../world/test-context';
import {
  fillExperienceBasicInfo,
  fillExperienceAudienceInfo,
  fillExperienceBookingInfo,
  fillExperienceTicketsInfo,
  fillExperiencePageInfo,
  fillExperienceDetailsInfo,
  verifyConfirmationPage,
  type ExperienceBasicInfoData,
  type ExperienceAudienceData,
  type ExperienceBookingData,
  type ExperienceTicketsData,
  type ExperiencePageData,
  type ExperienceDetailsData,
} from '../../../e2e-test/fixtures/helpers/creation-flow-helpers';

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

When('I fill the basic info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperienceBasicInfoData = {
    title: data.title,
    slug: data.slug,
    category: data.category,
    type: data.type as ExperienceBasicInfoData['type'],
  };
  await fillExperienceBasicInfo(this.page, payload);
});

When('I fill the audience info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperienceAudienceData = {
    access: data.access as ExperienceAudienceData['access'],
    targetAudience: data.targetAudience as ExperienceAudienceData['targetAudience'],
    expertise: data.expertise as ExperienceAudienceData['expertise'],
    primaryLanguage: data.primaryLanguage,
  };
  await fillExperienceAudienceInfo(this.page, payload);
});

When('I fill the booking info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperienceBookingData = {
    durationHours: parseNumber(data.durationHours),
    durationMinutes: parseNumber(data.durationMinutes),
    timezone: data.timezone,
  };
  await fillExperienceBookingInfo(this.page, payload);
});

When('I fill the tickets info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperienceTicketsData = {
    serviceFee: data.serviceFee as ExperienceTicketsData['serviceFee'],
    tickets: [
      {
        type: (data.ticketType || 'Free') as 'Paid' | 'Free',
        name: data.ticketName || 'General',
        quantity: parseNumber(data.ticketQuantity) || 1,
      },
    ],
  };
  await fillExperienceTicketsInfo(this.page, payload);
});

When('I fill the page info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperiencePageData = {
    description: data.description,
  };
  await fillExperiencePageInfo(this.page, payload);
});

When('I fill the details info with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: ExperienceDetailsData = {
    learningOutcomes: data.learningOutcomes,
    instructions: data.instructions,
  };
  await fillExperienceDetailsInfo(this.page, payload);
});

Then('I should see the confirmation page', async function (this: TestContext) {
  await verifyConfirmationPage(this.page);
  await expect(this.page).toHaveURL(/confirm|review|summary/i);
});
