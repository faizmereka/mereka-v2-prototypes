import mongoose from 'mongoose';

// Define a simple schema
const WhatsAppLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },
    hubId: { type: mongoose.Schema.Types.ObjectId },
    templateId: { type: String, required: true },
    toPhone: { type: String, required: true },
    status: { type: String, default: 'PENDING' },
    data: { type: Object },
  },
  { timestamps: true },
);

const WhatsAppLog = mongoose.model('WhatsAppLog', WhatsAppLogSchema);

async function main() {
  await mongoose.connect(
    'mongodb://admin:n3HcrMSP8pu4XieOuZmyL14cg@localhost:27017/mereka?authSource=admin',
  );

  // Create test WhatsApp log
  const log = await WhatsAppLog.create({
    userId: new mongoose.Types.ObjectId('698a1d0cc255314281349dcb'),
    templateId: 'OTP_LOGIN_CODE',
    toPhone: '+60123456789',
    status: 'PENDING',
    data: {
      userName: 'Test User',
      otpCode: '123456',
    },
  });

  console.log('Created WhatsApp log:', log._id);

  // Create another one
  const log2 = await WhatsAppLog.create({
    userId: new mongoose.Types.ObjectId('698a1d0cc255314281349dcb'),
    templateId: 'BOOKING_CONFIRMED_LEARNER',
    toPhone: '+60123456789',
    status: 'SENT',
    data: {
      userName: 'Test User',
      experienceName: 'Photography Workshop',
      bookingDate: '2026-02-15',
    },
  });

  console.log('Created WhatsApp log 2:', log2._id);

  // Count total
  const count = await WhatsAppLog.countDocuments({
    userId: new mongoose.Types.ObjectId('698a1d0cc255314281349dcb'),
  });
  console.log('Total WhatsApp logs for user:', count);

  await mongoose.disconnect();
}

main().catch(console.error);
