import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('No MONGODB_URI');
  await mongoose.connect(uri);

  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');

  const proposal = await db
    .collection('jobproposals')
    .findOne({ _id: new mongoose.Types.ObjectId('696f985694b9a35ad44321f7') });

  console.log('Proposal:', JSON.stringify(proposal, null, 2));
  console.log('\nasssignedExpertId:', proposal?.asssignedExpertId);
  console.log('createdBy:', proposal?.createdBy);

  await mongoose.disconnect();
}

main().catch(console.error);
