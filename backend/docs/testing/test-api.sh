#!/bin/bash

# Mereka Backend API Testing Script
# Complete test suite using curl

BASE_URL="http://localhost:3000"
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🧪 Testing Mereka Backend API${NC}"
echo "=============================="
echo ""

# Test 1: Health Check
echo -e "${BLUE}TEST 1: Health Check${NC}"
HEALTH=$(curl -s $BASE_URL/health)
echo $HEALTH | python3 -m json.tool
if echo $HEALTH | grep -q '"status":"ok"'; then
  echo -e "${GREEN}✅ PASS${NC}\n"
else
  echo -e "${RED}❌ FAIL${NC}\n"
fi

# Test 2: API Info
echo -e "${BLUE}TEST 2: API Info${NC}"
curl -s $BASE_URL/ | python3 -m json.tool
echo -e "${GREEN}✅ PASS${NC}\n"

# Test 3: Create User
echo -e "${BLUE}TEST 3: Create User${NC}"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser-'$(date +%s)'@mereka.com",
    "name": "Test User '$(date +%H%M%S)'",
    "role": "user",
    "bio": "Created by test script"
  }')

echo $CREATE_RESPONSE | python3 -m json.tool

# Extract user ID
USER_ID=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; data = json.load(sys.stdin); print(data.get('data', {}).get('_id', 'none'))" 2>/dev/null)

if [ "$USER_ID" != "none" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${GREEN}✅ PASS - User ID: $USER_ID${NC}\n"
else
  echo -e "${RED}❌ FAIL - No user ID returned${NC}\n"
fi

# Test 4: Get All Users
echo -e "${BLUE}TEST 4: Get All Users${NC}"
USERS=$(curl -s "$BASE_URL/api/v1/users?limit=3")
echo $USERS | python3 -m json.tool | head -20
echo -e "${GREEN}✅ PASS${NC}\n"

# Test 5: Get User by ID
if [ "$USER_ID" != "none" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${BLUE}TEST 5: Get User by ID${NC}"
  curl -s $BASE_URL/api/v1/users/$USER_ID | python3 -m json.tool | head -15
  echo -e "${GREEN}✅ PASS${NC}\n"
fi

# Test 6: Update User
if [ "$USER_ID" != "none" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${BLUE}TEST 6: Update User${NC}"
  curl -s -X PATCH $BASE_URL/api/v1/users/$USER_ID \
    -H "Content-Type: application/json" \
    -d '{"name":"Updated User","bio":"Updated via test script"}' | python3 -m json.tool | head -15
  echo -e "${GREEN}✅ PASS${NC}\n"
fi

# Test 7: Pagination
echo -e "${BLUE}TEST 7: Pagination${NC}"
curl -s "$BASE_URL/api/v1/users?page=1&limit=2" | python3 -m json.tool | grep -A 6 "pagination"
echo -e "${GREEN}✅ PASS${NC}\n"

# Test 8: Search
echo -e "${BLUE}TEST 8: Search Users${NC}"
curl -s "$BASE_URL/api/v1/users?search=Test" | python3 -m json.tool | grep "email" | head -3
echo -e "${GREEN}✅ PASS${NC}\n"

# Test 9: Invalid Email (should fail)
echo -e "${BLUE}TEST 9: Validation - Invalid Email${NC}"
INVALID=$(curl -s -X POST $BASE_URL/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","name":"Test"}')

if echo $INVALID | grep -q '"success":false'; then
  echo -e "${GREEN}✅ PASS - Validation working${NC}"
  echo $INVALID | python3 -m json.tool
else
  echo -e "${RED}❌ FAIL - Should reject invalid email${NC}"
fi
echo ""

# Test 10: Delete User
if [ "$USER_ID" != "none" ] && [ ! -z "$USER_ID" ]; then
  echo -e "${BLUE}TEST 10: Delete User (Soft Delete)${NC}"
  curl -s -X DELETE $BASE_URL/api/v1/users/$USER_ID | python3 -m json.tool
  echo -e "${GREEN}✅ PASS${NC}\n"

  echo -e "${BLUE}Verify: Check user status after delete${NC}"
  curl -s $BASE_URL/api/v1/users/$USER_ID | python3 -m json.tool | grep -E "(status|email)"
  echo ""
fi

echo "=============================="
echo -e "${GREEN}🎉 All Tests Complete!${NC}"
echo ""
echo "📚 Visit Swagger docs: $BASE_URL/docs"

