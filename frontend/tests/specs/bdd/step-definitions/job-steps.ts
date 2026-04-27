import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { DataTable } from '@cucumber/cucumber';
import type { TestContext } from '../world/test-context';
import {
  fillJobOverview,
  fillJobRequirements,
  fillJobTimelineBudget,
  fillJobYourDetail,
  type JobOverviewData,
  type JobRequirementsData,
  type JobTimelineBudgetData,
  type JobYourDetailData,
} from '../../../e2e-test/fixtures/helpers/creation-flow-helpers';

function parseNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

When('I fill the job overview with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: JobOverviewData = {
    title: data.title,
    category: data.category,
    serviceType: data.serviceType,
    employmentType: data.employmentType,
    location: data.location,
    expertLevel: data.expertLevel,
  };
  await fillJobOverview(this.page, payload);
});

When('I fill the job requirements with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: JobRequirementsData = {
    description: data.description,
    skills: data.skills ? data.skills.split(',').map(item => item.trim()) : undefined,
    qualifications: data.qualifications ? data.qualifications.split(',').map(item => item.trim()) : undefined,
  };
  await fillJobRequirements(this.page, payload);
});

When('I fill the job timeline and budget with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: JobTimelineBudgetData = {
    timeline: data.timeline,
    budgetType: data.budgetType,
    currency: data.currency,
    amount: parseNumber(data.amount),
  };
  await fillJobTimelineBudget(this.page, payload);
});

When('I fill the job client details with:', async function (this: TestContext, table: DataTable) {
  const data = table.rowsHash() as Record<string, string>;
  const payload: JobYourDetailData = {
    clientName: data.clientName,
    organizationDetails: data.organizationDetails,
    aboutOrganization: data.aboutOrganization,
  };
  await fillJobYourDetail(this.page, payload);
});

Then('I should see the job confirmation page', async function (this: TestContext) {
  const confirmationText = this.page.getByText(/confirm|review|summary|publish/i);
  await expect(confirmationText.first()).toBeVisible({ timeout: 10000 });
});
