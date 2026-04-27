// Seed script for MongoDB - run with: mongosh "mongodb://..." seed-data.js

const users = db.users.find({}).limit(5).toArray();
const expertUser = users[0];
const clientUser = users[1] || users[0];

print(`Expert: ${expertUser._id} - ${expertUser.name}`);
print(`Client: ${clientUser._id} - ${clientUser.name}`);

// 1. Create Hub (uses 'hubs' collection - Mongoose model name 'Hub')
print('');
print('=== CREATING HUB ===');

// Get first existing hub or create one
let hubId;
const existingHub = db.hubs.findOne({});
if (existingHub) {
  hubId = existingHub._id;
  print(`Using existing hub: ${existingHub.name} (ID: ${hubId})`);
} else {
  // Create a minimal hub if none exists
  const hubResult = db.hubs.insertOne({
    name: 'Tech Solutions Hub',
    slug: 'tech-solutions-hub',
    logo: 'https://picsum.photos/200',
    phoneNumber: '+60123456789',
    description: 'A premier technology solutions hub',
    location: {
      city: 'Kuala Lumpur',
      country: 'Malaysia',
    },
    status: 'active',
    onboardingStep: 4,
    isActive: true,
    isFeatured: false,
    displayOrder: 1000,
    ownerId: clientUser._id.toString(),
    createdBy: clientUser._id.toString(),
    lastUpdatedBy: clientUser._id.toString(),
    amenities: [],
    facilities: [],
    focusAreas: [],
    spaceTypes: [],
    experienceTypes: [],
    tags: [],
    services: [],
    gallery: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  hubId = hubResult.insertedId;
  print(`Hub created: ${hubId}`);
}

// 2. Get accepted proposals to create contracts
print('');
print('=== CREATING CONTRACTS ===');
const acceptedProposals = db.jobproposals.find({ status: 'accepted' }).toArray();
print(`Found ${acceptedProposals.length} accepted proposals`);

const statuses = ['pending', 'active', 'completed'];
let createdCount = 0;

for (let i = 0; i < acceptedProposals.length; i++) {
  const proposal = acceptedProposals[i];
  const job = db.jobs.findOne({ _id: proposal.jobId });

  if (job === null) {
    print(`Job not found for proposal: ${proposal._id}`);
    continue;
  }

  const contractExists = db.jobcontracts.findOne({ jobProposalId: proposal._id });
  if (contractExists !== null) {
    print(`Contract already exists for proposal: ${proposal._id}`);
    continue;
  }

  const status = statuses[i % 3];
  const priceType = proposal.priceType || 'fixed';

  const contract = {
    jobId: proposal.jobId,
    jobProposalId: proposal._id,
    hubId: job.hubId,
    contractTitle: `${job.jobTitle} Contract`,
    contractDescription: `Contract for: ${(job.jobDescription || 'Job description').substring(0, 200)}`,
    contractUploads: [],
    priceType: priceType,
    proposedPrice: proposal.proposedPrice || 5000,
    hourlyProposedPrice: proposal.hourlyProposedPrice || 50,
    weeklyLimit: 40,
    hasMilestones: true,
    selectedCurrency: proposal.selectedCurrency || 'MYR',
    startDate: new Date(),
    status: status,
    asssignedExpertId: proposal.expertId || expertUser._id,
    createdBy: job.createdBy || clientUser._id,
    expertId: proposal.expertId || expertUser._id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = db.jobcontracts.insertOne(contract);
  print(`Created contract ${result.insertedId} with status: ${status}`);
  createdCount++;
}

print('');
print('=== VERIFICATION ===');
print(`Total Hubs: ${db.agencies.countDocuments()}`);
print(`Total Contracts: ${db.jobcontracts.countDocuments()}`);
print(`Contracts created: ${createdCount}`);
