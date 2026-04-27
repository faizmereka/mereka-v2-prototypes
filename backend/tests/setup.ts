import { config } from 'dotenv';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach } from 'vitest';

// Load test environment variables
config({ path: '.env.test' });

// Check if running unit tests (which don't need database)
// Unit tests should set VITEST_POOL_ID or we can detect from test file paths
const isUnitTest = process.env.UNIT_TEST === 'true';

/**
 * Connect to test database before all tests (skip for unit tests)
 */
beforeAll(async () => {
  if (isUnitTest) {
    console.log('✅ Unit test setup - skipping database connection');
    return;
  }

  const testUri = process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/mereka_test';

  try {
    await mongoose.connect(testUri);
    console.log('✅ Connected to test database');
  } catch (error) {
    console.error('❌ Error connecting to test database:', error);
    throw error;
  }
});

/**
 * Clean up database before each test (skip for unit tests)
 */
beforeEach(async () => {
  if (isUnitTest) {
    return;
  }

  const collections = mongoose.connection.collections;

  for (const key in collections) {
    const collection = collections[key];
    if (collection) {
      await collection.deleteMany({});
    }
  }
});

/**
 * Disconnect from database after all tests (skip for unit tests)
 */
afterAll(async () => {
  if (isUnitTest) {
    console.log('✅ Unit tests completed (no database cleanup needed)');
    return;
  }

  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log('✅ Test database cleaned and disconnected');
  } catch (error) {
    console.error('❌ Error cleaning up test database:', error);
    throw error;
  }
});
