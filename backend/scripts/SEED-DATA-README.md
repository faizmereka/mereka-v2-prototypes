# Seed Reference Data

This directory contains scripts to populate the database with initial reference data.

## Quick Start

### 1. Start the backend server

```bash
npm run dev
```

### 2. Run the seed script

```bash
./scripts/seed-reference-data.sh
```

## What Gets Seeded

The script populates the following collections:

### 1. **Focus Areas** (6 items)

- Career & Business
- Tech & AI
- Design & Branding
- ESG
- Arts & Culture
- Health & Wellness

### 2. **Skills** (~28 items, linked to Focus Areas)

- **Career & Business**: Business Analyst, Project Management, Leadership, etc.
- **Tech & AI**: Software Developer, AI Engineer, DevOps Engineer, etc.
- **Design & Branding**: UI/UX Design, Graphic Design, Branding, etc.

### 3. **Amenities** (10 items)

- WiFi, Coffee/Tea, Parking, Air Conditioning, Kitchen, Lockers, etc.

### 4. **Facilities** (10 items)

- Projector, Whiteboard, Audio System, Video Recording Studio, etc.

### 5. **Job Preferences** (5 items)

- Trainer, Coach, Consultant, Project Manager, Service Retainer

### 6. **Languages** (10 items)

- English, Mandarin, Hindi, Spanish, French, Arabic, Malay, etc.

### 7. **Space Types** (8 items)

- Conference Room, Desk/Workstation, Studio, Workshop Space, etc.

### 8. **Experience Types** (8 items)

- Workshop, Seminar, Training Program, Conference, Masterclass, etc.

### 9. **Company Types** (8 items)

- Startup, SME, Corporate, NGO, Social Enterprise, etc.

## Authentication

The script will:

1. Try to register a new user: `admin-seed@mereka.dev`
2. If user exists, login with the same credentials
3. Use the auth token for all subsequent requests

## Script Features

- ✅ Idempotent (safe to run multiple times)
- ✅ Colored output for better visibility
- ✅ Skips existing items
- ✅ Creates relationships (Skills → Focus Areas)
- ✅ Sets priorities for ordering
- ✅ Includes descriptions where appropriate

## View Seeded Data

After running the script, you can view all data at:

- http://localhost:4000/api/v1/focus-areas
- http://localhost:4000/api/v1/skills
- http://localhost:4000/api/v1/amenities
- http://localhost:4000/api/v1/facilities
- http://localhost:4000/api/v1/job-preferences
- http://localhost:4000/api/v1/languages
- http://localhost:4000/api/v1/space-types
- http://localhost:4000/api/v1/experience-types
- http://localhost:4000/api/v1/company-types

Or use the Swagger UI at: http://localhost:4000/docs

## Manual Seeding (Individual Collections)

If you want to seed specific collections manually, here are some example curl commands:

### Create a Focus Area

```bash
curl -X POST http://localhost:4000/api/v1/focus-areas \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Tech & AI",
    "icon": "cpu",
    "description": "Technology and AI expertise",
    "priority": 1
  }'
```

### Create an Amenity

```bash
curl -X POST http://localhost:4000/api/v1/amenities \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "WiFi", "priority": 1}'
```

### Create a Skill (with Focus Area link)

```bash
curl -X POST http://localhost:4000/api/v1/skills \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "UI/UX Design",
    "focusAreaId": "FOCUS_AREA_ID_HERE",
    "type": "primary",
    "priority": 1
  }'
```

### Get All Items (Including Inactive)

```bash
curl http://localhost:4000/api/v1/amenities?includeInactive=true
```

## Troubleshooting

### Backend not running

Make sure the backend is running on port 4000:

```bash
npm run dev
```

### Authentication failed

Check that your `.env` file is configured correctly:

```bash
npm run env:doctor
```

### MongoDB connection issues

Verify your MongoDB connection:

```bash
# Check if MongoDB is accessible
mongosh "$MONGODB_URI" --eval "db.adminCommand('ping')"
```

### Permission denied

Make the script executable:

```bash
chmod +x scripts/seed-reference-data.sh
```

## Advanced Usage

### Modify the seed data

Edit `scripts/seed-reference-data.sh` and modify the arrays:

```bash
# Example: Add more amenities
amenities=(
  "WiFi"
  "Coffee/Tea"
  "Your New Amenity"  # Add here
)
```

### Run specific sections

Comment out sections you don't want to seed:

```bash
# Comment out to skip seeding amenities
# echo -e "${YELLOW}Step 4: Seeding Amenities...${NC}"
# ... rest of amenities code
```

### Use different auth credentials

Modify the registration payload in the script:

```bash
register_response=$(post_data "auth/register" '{
  "email": "your-email@example.com",  # Change here
  "name": "Your Name",
  "password": "YourPassword123!",
  "confirmPassword": "YourPassword123!",
  "birthDate": "1990-01-01"
}')
```

## Clean Up

To remove all seeded data and start fresh:

```bash
# Connect to MongoDB
mongosh "$MONGODB_URI"

# Drop collections
db.focusareas.drop()
db.skills.drop()
db.amenities.drop()
db.facilities.drop()
db.jobpreferences.drop()
db.languages.drop()
db.spacetypes.drop()
db.experiencetypes.drop()
db.companytypes.drop()

# Run seed script again
./scripts/seed-reference-data.sh
```

## Notes

- The script is **idempotent** - running it multiple times won't create duplicates
- Items are created with `isActive: true` by default
- Priority determines the display order in the frontend
- Skills are linked to Focus Areas via `focusAreaId`
- All other collections are independent

## Adding More Data

To add more comprehensive data (e.g., all 76 skills from the frontend):

1. Edit the `*_skills` arrays in the script
2. Add all skills for each category
3. Run the script again

Example:

```bash
# Add more Tech & AI skills
tech_skills=(
  "Software Developer"
  "Cybersecurity"
  # ... add more skills here
  "Cloud Architect"
  "Data Scientist"
)
```
