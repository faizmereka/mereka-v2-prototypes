/**
 * Script to update pending payments with valid contract IDs
 * Run: npx tsx scripts/db/fix-pending-payment-contracts.ts
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mereka';

// Real contract IDs and titles from the database
const realContracts = [
  { id: '69206b6e172015d36cd2d26d', title: 'E-Commerce Redesign - Fixed Price' },
  { id: '69206bdc172015d36cd2d288', title: 'Mobile App Development - Hourly Contract' },
  { id: '6923e05577400863465acbd1', title: 'API Integration Testing Contract' },
  { id: '6923e0dd77400863465acbef', title: 'Hourly API Development Contract' },
  { id: '693023a009235703268d18ff', title: 'Contract - Full-stack developer specializ' },
  { id: '693023a009235703268d1900', title: 'Contract - Senior API developer available' },
];

async function fixPendingPaymentContracts() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const pendingPayments = db.collection('pendingPayments');

    // Get all pending payments
    const payments = await pendingPayments.find({}).toArray();
    console.log(`Found ${payments.length} pending payments`);

    // Update each pending payment with a real contract ID
    for (const [i, payment] of payments.entries()) {
      const contract = realContracts[i % realContracts.length];
      if (!contract) continue;

      await pendingPayments.updateOne(
        { _id: payment._id },
        {
          $set: {
            contractId: contract.id,
            contractTitle: contract.title,
          },
        },
      );

      console.log(`Updated payment ${payment._id} -> contract ${contract.id} (${contract.title})`);
    }

    console.log('\nAll pending payments updated successfully!');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

fixPendingPaymentContracts();
