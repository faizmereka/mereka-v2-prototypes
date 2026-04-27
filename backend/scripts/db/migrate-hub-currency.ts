/**
 * Migration script to set currency on existing hubs based on their country
 *
 * Run: npx tsx scripts/db/migrate-hub-currency.ts
 *
 * Options:
 *   --dry-run    Preview changes without applying them
 *   --verbose    Show detailed output for each hub
 */

import { config } from 'dotenv';
import mongoose from 'mongoose';

config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mereka';

// Country to currency mapping (subset of stripe-countries.ts for script independence)
const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  // Southeast Asia
  Malaysia: 'MYR',
  Singapore: 'SGD',
  Thailand: 'THB',
  Indonesia: 'IDR',
  Philippines: 'PHP',
  Vietnam: 'VND',
  Brunei: 'BND',
  Cambodia: 'USD',

  // East Asia
  Japan: 'JPY',
  'Hong Kong': 'HKD',
  'South Korea': 'KRW',
  Taiwan: 'TWD',
  China: 'CNY',

  // South Asia
  India: 'INR',
  Bangladesh: 'BDT',
  Pakistan: 'PKR',
  'Sri Lanka': 'LKR',

  // Oceania
  Australia: 'AUD',
  'New Zealand': 'NZD',

  // Europe
  'United Kingdom': 'GBP',
  Ireland: 'EUR',
  France: 'EUR',
  Germany: 'EUR',
  Netherlands: 'EUR',
  Spain: 'EUR',
  Italy: 'EUR',
  Switzerland: 'CHF',

  // Americas
  'United States': 'USD',
  USA: 'USD',
  Canada: 'CAD',
  Mexico: 'MXN',
  Brazil: 'BRL',

  // Middle East
  'United Arab Emirates': 'AED',
  UAE: 'AED',
  'Saudi Arabia': 'SAR',
  Qatar: 'QAR',
  Kuwait: 'KWD',

  // Africa
  'South Africa': 'ZAR',
  Nigeria: 'NGN',
  Kenya: 'KES',
  Egypt: 'EGP',
};

const DEFAULT_CURRENCY = 'MYR';

function getCurrencyFromCountry(countryName?: string): string {
  if (!countryName) {
    return DEFAULT_CURRENCY;
  }

  // Try exact match
  const currency = COUNTRY_CURRENCY_MAP[countryName];
  if (currency) {
    return currency;
  }

  // Try case-insensitive match
  const normalizedName = countryName.trim().toLowerCase();
  for (const [name, curr] of Object.entries(COUNTRY_CURRENCY_MAP)) {
    if (name.toLowerCase() === normalizedName) {
      return curr;
    }
  }

  // Default to MYR
  return DEFAULT_CURRENCY;
}

async function migrateHubCurrency() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const isVerbose = args.includes('--verbose');

  console.log('==========================================');
  console.log('Hub Currency Migration Script');
  console.log('==========================================');
  if (isDryRun) {
    console.log('MODE: Dry run (no changes will be made)');
  } else {
    console.log('MODE: Live migration');
  }
  console.log('');

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    console.log('');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    const hubsCollection = db.collection('hubs');

    // Find all hubs without currency set
    const hubsWithoutCurrency = await hubsCollection
      .find({ currency: { $exists: false } })
      .toArray();

    console.log(`Found ${hubsWithoutCurrency.length} hubs without currency field`);

    if (hubsWithoutCurrency.length === 0) {
      console.log('No hubs need migration. All hubs already have currency set.');
      return;
    }

    console.log('');

    // Track statistics
    const stats = {
      total: hubsWithoutCurrency.length,
      updated: 0,
      skipped: 0,
      byCountry: {} as Record<string, number>,
      byCurrency: {} as Record<string, number>,
    };

    for (const hub of hubsWithoutCurrency) {
      const country = hub.location?.country;
      const currency = getCurrencyFromCountry(country);

      // Track stats
      stats.byCountry[country || 'Unknown'] = (stats.byCountry[country || 'Unknown'] || 0) + 1;
      stats.byCurrency[currency] = (stats.byCurrency[currency] || 0) + 1;

      if (isVerbose) {
        console.log(`Hub: ${hub.name} (${hub._id})`);
        console.log(`  Country: ${country || 'Not set'}`);
        console.log(`  Currency: ${currency}`);
      }

      if (!isDryRun) {
        await hubsCollection.updateOne({ _id: hub._id }, { $set: { currency } });

        if (isVerbose) {
          console.log('  Status: Updated');
        }
        stats.updated++;
      } else {
        if (isVerbose) {
          console.log('  Status: Would update (dry run)');
        }
        stats.updated++;
      }

      if (isVerbose) {
        console.log('');
      }
    }

    // Print summary
    console.log('==========================================');
    console.log('Migration Summary');
    console.log('==========================================');
    console.log(`Total hubs processed: ${stats.total}`);
    console.log(`Hubs ${isDryRun ? 'to be updated' : 'updated'}: ${stats.updated}`);
    console.log('');
    console.log('By Country:');
    for (const [country, count] of Object.entries(stats.byCountry).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${country}: ${count}`);
    }
    console.log('');
    console.log('By Currency:');
    for (const [currency, count] of Object.entries(stats.byCurrency).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${currency}: ${count}`);
    }

    if (isDryRun) {
      console.log('');
      console.log('This was a dry run. No changes were made.');
      console.log('Run without --dry-run to apply changes.');
    } else {
      console.log('');
      console.log('Migration completed successfully!');
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('');
    console.log('Disconnected from MongoDB');
  }
}

migrateHubCurrency();
