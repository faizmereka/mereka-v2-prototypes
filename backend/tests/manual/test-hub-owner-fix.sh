#!/bin/bash

#####################################################################
# Test script to verify addHubOwner fix
# This script tests that hub owners are properly added as members
# when creating a new hub.
#####################################################################

set -e  # Exit on error

echo "🧪 Testing Hub Owner Membership Fix"
echo "====================================================================="
echo ""

# Configuration
BASE_URL="http://localhost:3000/api/v1"
TEST_EMAIL="test-hub-owner-$(date +%s)@test.com"

echo "📋 Test Configuration:"
echo "   Base URL: $BASE_URL"
echo "   Test Email: $TEST_EMAIL"
echo ""

# Step 1: Register new user
echo "1️⃣  Registering test user..."
REGISTER_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"TestPass123!\",
    \"confirmPassword\": \"TestPass123!\",
    \"name\": \"Test Hub Owner\",
    \"birthDate\": \"15/05/1985\"
  }")

if echo "$REGISTER_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ User registered successfully"
else
  echo "❌ Failed to register user:"
  echo "$REGISTER_RESPONSE" | jq .
  exit 1
fi
echo ""

# Step 2: Login
echo "2️⃣  Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{
    \"email\": \"${TEST_EMAIL}\",
    \"password\": \"TestPass123!\"
  }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')
USER_ID=$(echo "$LOGIN_RESPONSE" | jq -r '.data.user.id')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to login"
  echo "$LOGIN_RESPONSE" | jq .
  exit 1
fi

echo "✅ Login successful"
echo "   User ID: $USER_ID"
echo "   Token: ${TOKEN:0:30}..."
echo ""

# Step 3: Create hub
echo "3️⃣  Creating hub..."
SLUG="test-hub-$(date +%s)"
HUB_RESPONSE=$(curl -s -X POST "${BASE_URL}/hub-profile" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"name\": \"Test Hub $(date +%s)\",
    \"slug\": \"${SLUG}\",
    \"logo\": \"https://example.com/logo.png\",
    \"phoneNumber\": \"+60123456789\",
    \"agencyName\": \"Test Agency\",
    \"agencyLogo\": \"https://example.com/agency.png\",
    \"location\": {
      \"address\": \"123 Test Street\",
      \"city\": \"Kuala Lumpur\",
      \"state\": \"Federal Territory\",
      \"country\": \"Malaysia\",
      \"postcode\": \"50000\",
      \"lat\": 3.139,
      \"lng\": 101.6869
    },
    \"description\": \"Test hub for owner membership verification\"
  }")

if echo "$HUB_RESPONSE" | jq -e '.success' > /dev/null; then
  HUB_ID=$(echo "$HUB_RESPONSE" | jq -r '.data.hubId')
  echo "✅ Hub created successfully"
  echo "   Hub ID: $HUB_ID"
  echo "   Slug: $SLUG"
else
  echo "❌ Failed to create hub:"
  echo "$HUB_RESPONSE" | jq .
  exit 1
fi
echo ""

# Step 4: Verify owner membership exists
echo "4️⃣  Verifying owner membership..."
echo "   Checking server logs for 'Owner membership created'..."
echo ""

# Step 5: Test invitation creation (requires owner membership)
echo "5️⃣  Testing invitation creation..."
INVITE_RESPONSE=$(curl -s -X POST "${BASE_URL}/hubs/${HUB_ID}/members/invite" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "invitations": [
      {
        "email": "test-admin@example.com",
        "roleKey": "admin",
        "title": "Test Administrator"
      }
    ]
  }')

if echo "$INVITE_RESPONSE" | jq -e '.success' > /dev/null; then
  echo "✅ Invitation created successfully"
  echo "   This confirms owner membership is working!"
  echo "$INVITE_RESPONSE" | jq .
else
  ERROR_CODE=$(echo "$INVITE_RESPONSE" | jq -r '.error.code // .code')
  if [ "$ERROR_CODE" = "NOT_HUB_MEMBER" ]; then
    echo "❌ FAILED: Owner is not a hub member!"
    echo "   The addHubOwner fix did not work correctly."
  else
    echo "⚠️  Invitation failed with error: $ERROR_CODE"
  fi
  echo "$INVITE_RESPONSE" | jq .
  exit 1
fi
echo ""

echo "====================================================================="
echo "✅ All tests passed!"
echo ""
echo "Summary:"
echo "  - User registered and logged in"
echo "  - Hub created with ID: $HUB_ID"
echo "  - Owner membership verified (invitation creation succeeded)"
echo ""
echo "Check server logs above for debug output from addHubOwner()"
echo "====================================================================="
