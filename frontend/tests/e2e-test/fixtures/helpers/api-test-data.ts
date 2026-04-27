/**
 * Test Data for E2E Tests
 * 
 * Centralized test data for E2E testing
 */

export const TEST_USER = {
  email: process.env.TEST_EMAIL || 'testingmereka01@gmail.com',
  password: process.env.TEST_PASSWORD || 'merekamereka',
  name: 'Fadlan Test User',
  phone: '0123456789'
};

/**
 * Generate a unique email address for testing
 * Uses timestamp + random string + counter to ensure uniqueness
 */
let emailCounter = 0;
export function generateUniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8); // 6 random chars
  const counter = ++emailCounter;
  return `testingmereka01+${timestamp}-${random}-${counter}@gmail.com`;
}

export function generateUniqueTitle(prefix: string): string {
  const timestamp = Date.now();
  return `${prefix} ${timestamp}`;
}

export function getFutureDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}
