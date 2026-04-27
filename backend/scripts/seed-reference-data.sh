#!/bin/bash

# Seed Reference Data Script
# Populates all reference data collections with sample data
# Compatible with Bash 3.2+ (macOS default)

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="http://localhost:4000/api/v1"

# Helper function to POST data
post_data() {
  local endpoint="$1"
  local data="$2"
  curl -s -X POST "$BASE_URL/$endpoint" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "$data"
}

# Helper function to GET data
get_data() {
  local endpoint="$1"
  curl -s "$BASE_URL/$endpoint" \
    -H "Authorization: Bearer $AUTH_TOKEN"
}

echo -e "${YELLOW}=== Reference Data Seeding Script ===${NC}\n"

# ==========================================
# Step 1: Authentication
# ==========================================
echo -e "${YELLOW}Step 1: Getting authentication token...${NC}"

# Try to register a new user
register_response=$(post_data "auth/register" '{
  "email": "admin-seed@mereka.dev",
  "name": "Admin Seed",
  "password": "Admin123!",
  "confirmPassword": "Admin123!",
  "birthDate": "01/01/1990"
}')

# Try to extract token from response
AUTH_TOKEN=$(echo "$register_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

# If registration failed, try login
if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${YELLOW}Registration failed, trying login...${NC}"
  login_response=$(post_data "auth/login" '{
    "email": "admin-seed@mereka.dev",
    "password": "Admin123!"
  }')
  AUTH_TOKEN=$(echo "$login_response" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$AUTH_TOKEN" ]; then
  echo -e "${RED}Failed to get authentication token${NC}"
  echo "Register response: $register_response"
  echo "Login response: $login_response"
  exit 1
fi

echo -e "${GREEN}✓ Authentication successful${NC}\n"

# ==========================================
# Step 2: Seed Focus Areas
# ==========================================
echo -e "${YELLOW}Step 2: Seeding Focus Areas...${NC}"

# Array of focus areas (name|icon|description|priority)
focus_areas=(
  "Career & Business|briefcase|Business strategy, career development, and professional growth|1"
  "Tech & AI|cpu|Technology, artificial intelligence, and digital innovation|2"
  "Design & Branding|palette|Design thinking, branding, and creative expression|3"
  "ESG|leaf|Environmental, Social, and Governance initiatives|4"
  "Arts & Culture|music|Arts, culture, and creative industries|5"
  "Health & Wellness|heart|Health, wellness, and personal well-being|6"
)

for item in "${focus_areas[@]}"; do
  IFS='|' read -r name icon description priority <<< "$item"

  echo -n "  Creating Focus Area: $name... "
  response=$(post_data "focus-areas" "{
    \"name\": \"$name\",
    \"icon\": \"$icon\",
    \"description\": \"$description\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo "Response: $response"
  fi
done

# Get focus area IDs for linking skills
echo "  Fetching focus area IDs..."
focus_areas_response=$(get_data "focus-areas")

# Extract IDs (simple approach for bash 3.2)
career_id=$(echo "$focus_areas_response" | grep -o '"_id":"[^"]*","name":"Career & Business"' | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
tech_id=$(echo "$focus_areas_response" | grep -o '"_id":"[^"]*","name":"Tech & AI"' | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)
design_id=$(echo "$focus_areas_response" | grep -o '"_id":"[^"]*","name":"Design & Branding"' | grep -o '"_id":"[^"]*"' | cut -d'"' -f4)

echo -e "${GREEN}✓ Focus Areas seeded${NC}\n"

# ==========================================
# Step 3: Seed Skills
# ==========================================
echo -e "${YELLOW}Step 3: Seeding Skills...${NC}"

# Career & Business Skills
if [ ! -z "$career_id" ]; then
  career_skills=(
    "Business Analyst|primary|1"
    "Project Management|primary|2"
    "Leadership|primary|3"
    "Marketing Strategy|secondary|4"
  )

  for skill_data in "${career_skills[@]}"; do
    IFS='|' read -r skill_name skill_type skill_priority <<< "$skill_data"
    echo -n "  Creating Skill: $skill_name... "
    response=$(post_data "skills" "{
      \"name\": \"$skill_name\",
      \"focusAreaId\": \"$career_id\",
      \"type\": \"$skill_type\",
      \"priority\": $skill_priority
    }")

    if echo "$response" | grep -q '"success":true'; then
      echo -e "${GREEN}✓${NC}"
    elif echo "$response" | grep -q 'already exists'; then
      echo -e "${YELLOW}(exists)${NC}"
    else
      echo -e "${RED}✗${NC}"
    fi
  done
fi

# Tech & AI Skills
if [ ! -z "$tech_id" ]; then
  tech_skills=(
    "Software Developer|primary|1"
    "AI Engineer|primary|2"
    "DevOps Engineer|primary|3"
    "Data Analyst|secondary|4"
  )

  for skill_data in "${tech_skills[@]}"; do
    IFS='|' read -r skill_name skill_type skill_priority <<< "$skill_data"
    echo -n "  Creating Skill: $skill_name... "
    response=$(post_data "skills" "{
      \"name\": \"$skill_name\",
      \"focusAreaId\": \"$tech_id\",
      \"type\": \"$skill_type\",
      \"priority\": $skill_priority
    }")

    if echo "$response" | grep -q '"success":true'; then
      echo -e "${GREEN}✓${NC}"
    elif echo "$response" | grep -q 'already exists'; then
      echo -e "${YELLOW}(exists)${NC}"
    else
      echo -e "${RED}✗${NC}"
    fi
  done
fi

# Design & Branding Skills
if [ ! -z "$design_id" ]; then
  design_skills=(
    "UI/UX Design|primary|1"
    "Graphic Design|primary|2"
    "Branding|primary|3"
    "Content Creation|secondary|4"
  )

  for skill_data in "${design_skills[@]}"; do
    IFS='|' read -r skill_name skill_type skill_priority <<< "$skill_data"
    echo -n "  Creating Skill: $skill_name... "
    response=$(post_data "skills" "{
      \"name\": \"$skill_name\",
      \"focusAreaId\": \"$design_id\",
      \"type\": \"$skill_type\",
      \"priority\": $skill_priority
    }")

    if echo "$response" | grep -q '"success":true'; then
      echo -e "${GREEN}✓${NC}"
    elif echo "$response" | grep -q 'already exists'; then
      echo -e "${YELLOW}(exists)${NC}"
    else
      echo -e "${RED}✗${NC}"
    fi
  done
fi

echo -e "${GREEN}✓ Skills seeded${NC}\n"

# ==========================================
# Step 4: Seed Amenities
# ==========================================
echo -e "${YELLOW}Step 4: Seeding Amenities...${NC}"

amenities=(
  "WiFi|1"
  "Coffee/Tea|2"
  "Parking|3"
  "Air Conditioning|4"
  "Kitchen|5"
  "Lockers|6"
  "Meeting Rooms|7"
  "Printing Services|8"
  "24/7 Access|9"
  "Pet Friendly|10"
)

for item in "${amenities[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Amenity: $name... "
  response=$(post_data "amenities" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Amenities seeded${NC}\n"

# ==========================================
# Step 5: Seed Facilities
# ==========================================
echo -e "${YELLOW}Step 5: Seeding Facilities...${NC}"

facilities=(
  "Projector|1"
  "Whiteboard|2"
  "Audio System|3"
  "Video Recording Studio|4"
  "Photography Studio|5"
  "Workshop Tools|6"
  "3D Printer|7"
  "Podcast Setup|8"
  "Green Screen|9"
  "Event Space|10"
)

for item in "${facilities[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Facility: $name... "
  response=$(post_data "facilities" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Facilities seeded${NC}\n"

# ==========================================
# Step 6: Seed Job Preferences
# ==========================================
echo -e "${YELLOW}Step 6: Seeding Job Preferences...${NC}"

job_preferences=(
  "Trainer|1"
  "Coach|2"
  "Consultant|3"
  "Project Manager|4"
  "Service Retainer|5"
)

for item in "${job_preferences[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Job Preference: $name... "
  response=$(post_data "job-preferences" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Job Preferences seeded${NC}\n"

# ==========================================
# Step 7: Seed Languages
# ==========================================
echo -e "${YELLOW}Step 7: Seeding Languages...${NC}"

languages=(
  "English|en|1"
  "Mandarin|zh|2"
  "Hindi|hi|3"
  "Spanish|es|4"
  "French|fr|5"
  "Arabic|ar|6"
  "Malay|ms|7"
  "Tamil|ta|8"
  "Japanese|ja|9"
  "Korean|ko|10"
)

for item in "${languages[@]}"; do
  IFS='|' read -r name code priority <<< "$item"
  echo -n "  Creating Language: $name... "
  response=$(post_data "languages" "{
    \"name\": \"$name\",
    \"code\": \"$code\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Languages seeded${NC}\n"

# ==========================================
# Step 8: Seed Space Types
# ==========================================
echo -e "${YELLOW}Step 8: Seeding Space Types...${NC}"

space_types=(
  "Conference Room|1"
  "Desk/Workstation|2"
  "Studio|3"
  "Workshop Space|4"
  "Event Hall|5"
  "Private Office|6"
  "Hot Desk|7"
  "Meeting Pod|8"
)

for item in "${space_types[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Space Type: $name... "
  response=$(post_data "space-types" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Space Types seeded${NC}\n"

# ==========================================
# Step 9: Seed Experience Types
# ==========================================
echo -e "${YELLOW}Step 9: Seeding Experience Types...${NC}"

experience_types=(
  "Workshop|1"
  "Seminar|2"
  "Training Program|3"
  "Conference|4"
  "Masterclass|5"
  "Bootcamp|6"
  "Networking Event|7"
  "Hackathon|8"
)

for item in "${experience_types[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Experience Type: $name... "
  response=$(post_data "experience-types" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Experience Types seeded${NC}\n"

# ==========================================
# Step 10: Seed Company Types
# ==========================================
echo -e "${YELLOW}Step 10: Seeding Company Types...${NC}"

company_types=(
  "Startup|1"
  "SME|2"
  "Corporate|3"
  "NGO|4"
  "Social Enterprise|5"
  "Government Agency|6"
  "Educational Institution|7"
  "Freelancer/Individual|8"
)

for item in "${company_types[@]}"; do
  IFS='|' read -r name priority <<< "$item"
  echo -n "  Creating Company Type: $name... "
  response=$(post_data "company-types" "{
    \"name\": \"$name\",
    \"priority\": $priority
  }")

  if echo "$response" | grep -q '"success":true'; then
    echo -e "${GREEN}✓${NC}"
  elif echo "$response" | grep -q 'already exists'; then
    echo -e "${YELLOW}(exists)${NC}"
  else
    echo -e "${RED}✗${NC}"
  fi
done

echo -e "${GREEN}✓ Company Types seeded${NC}\n"

# ==========================================
# Summary
# ==========================================
echo -e "${GREEN}====================================${NC}"
echo -e "${GREEN}✅ Seeding completed successfully!${NC}"
echo -e "${GREEN}====================================${NC}\n"

echo "View your data at:"
echo "  • Focus Areas:      $BASE_URL/focus-areas"
echo "  • Skills:           $BASE_URL/skills"
echo "  • Amenities:        $BASE_URL/amenities"
echo "  • Facilities:       $BASE_URL/facilities"
echo "  • Job Preferences:  $BASE_URL/job-preferences"
echo "  • Languages:        $BASE_URL/languages"
echo "  • Space Types:      $BASE_URL/space-types"
echo "  • Experience Types: $BASE_URL/experience-types"
echo "  • Company Types:    $BASE_URL/company-types"
echo ""
echo "Or visit Swagger UI: http://localhost:4000/docs"
