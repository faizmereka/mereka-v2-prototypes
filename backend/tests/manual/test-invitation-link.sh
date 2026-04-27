#!/bin/bash
# Test script to verify invitation link creation API
# Tests: POST /api/v1/hubs/:hubId/invitation-links

set -e

BASE_URL="http://localhost:3000/api/v1"
HUB_ID="6916d5e87964fcc332692986"  # Replace with your hub ID

echo "🔗 Testing Hub Invitation Link API"
echo "=================================================="
echo ""

# Get token
echo "🔐 Getting authentication token..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-hub-owner-1763104231@test.com","password":"TestPass123!"}')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.tokens.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ Failed to get token"
  exit 1
fi

echo "✅ Token obtained"
echo ""

# Create invitation link
echo "🔗 Creating invitation link for 'expert' role..."
LINK_RESPONSE=$(curl -s -X POST "${BASE_URL}/hubs/${HUB_ID}/invitation-links" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "roleKey": "expert",
    "maxUses": 10,
    "expiresInDays": 7
  }')

echo "$LINK_RESPONSE" | jq '.'

# Check success
if echo "$LINK_RESPONSE" | jq -e '.success == true' > /dev/null 2>&1; then
  echo ""
  echo "✅ Invitation link created successfully!"
  
  # Extract details
  INVITE_TOKEN=$(echo "$LINK_RESPONSE" | jq -r '.data.token')
  INVITE_URL=$(echo "$LINK_RESPONSE" | jq -r '.data.url')
  
  echo ""
  echo "📋 Invitation Link Details:"
  echo "   Token: $INVITE_TOKEN"
  echo "   URL: $INVITE_URL"
  echo "   Max Uses: $(echo "$LINK_RESPONSE" | jq -r '.data.maxUses')"
  echo "   Used Count: $(echo "$LINK_RESPONSE" | jq -r '.data.usedCount')"
  echo "   Expires: $(echo "$LINK_RESPONSE" | jq -r '.data.expiresAt')"
  echo "   Status: $(echo "$LINK_RESPONSE" | jq -r '.data.status')"
else
  echo ""
  echo "❌ Failed to create invitation link"
  exit 1
fi

echo ""
echo "✅ All tests passed!"
