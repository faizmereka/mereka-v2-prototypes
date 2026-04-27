/**
 * Fix HubMember index to allow multiple pending invitations
 *
 * Run: npx tsx scripts/db/fix-hubmember-index.ts
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

config();

interface MongoIndex {
  name: string;
  key: Record<string, number>;
  unique?: boolean;
  sparse?: boolean;
  partialFilterExpression?: unknown;
}

async function fixIndex() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mereka';

  console.log('Connecting to MongoDB...');
  await mongoose.connect(mongoUri);
  console.log('Connected!');

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error('Database connection not established');
  }
  const collection = db.collection('hubmembers');

  // List current indexes
  console.log('\nCurrent indexes:');
  const indexes = (await collection.indexes()) as MongoIndex[];
  for (const idx of indexes) {
    const uniqueStr = idx.unique ? ' (unique)' : '';
    const sparseStr = idx.sparse ? ' (sparse)' : '';
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${uniqueStr}${sparseStr}`);
  }

  // Drop the old index if it exists
  const oldIndexName = 'hubId_1_userId_1';
  const hasOldIndex = indexes.some((idx) => idx.name === oldIndexName);

  if (hasOldIndex) {
    console.log(`\nDropping old index: ${oldIndexName}`);
    await collection.dropIndex(oldIndexName);
    console.log('Dropped!');
  } else {
    console.log('\nOld index not found, skipping drop.');
  }

  // Create new partial index - only enforce uniqueness when userId exists as ObjectId
  console.log('\nCreating new partial index...');
  await collection.createIndex(
    { hubId: 1, userId: 1 },
    {
      unique: true,
      partialFilterExpression: { userId: { $type: 'objectId' } },
      name: 'hubId_1_userId_1_partial',
    },
  );
  console.log('Created!');

  // Verify new indexes
  console.log('\nNew indexes:');
  const newIndexes = (await collection.indexes()) as MongoIndex[];
  for (const idx of newIndexes) {
    const uniqueStr = idx.unique ? ' (unique)' : '';
    const partialStr = idx.partialFilterExpression ? ' (partial)' : '';
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${uniqueStr}${partialStr}`);
  }

  await mongoose.disconnect();
  console.log('\nDone!');
}

fixIndex().catch(console.error);
