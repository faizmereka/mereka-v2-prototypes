import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const result = await db.collection('jobproposals').deleteMany({});

  console.log('Deleted proposals:', result.deletedCount);

  await mongoose.disconnect();
}

main().catch(console.error);
