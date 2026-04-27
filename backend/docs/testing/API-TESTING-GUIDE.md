# 🧪 API Testing Guide - curl Commands

Complete guide to test all Mereka Backend APIs using curl.

---

## 🚀 **Quick Start**

Make sure your server is running:

```bash
npm run dev
# or
npm start
```

Server should be at: **http://localhost:3000**

---

## 📋 **Test All Endpoints**

### **1. Health Check**

```bash
curl -X GET http://localhost:3000/health
```

**Expected Response**:

```json
{
  "status": "ok",
  "timestamp": "2025-11-01T...",
  "uptime": 123.45,
  "environment": "development",
  "mongodb": "connected"
}
```

---

### **2. API Info**

```bash
curl -X GET http://localhost:3000/
```

**Expected Response**:

```json
{
  "message": "Mereka Backend API",
  "version": "1.0.0",
  "documentation": "/docs",
  "health": "/health"
}
```

---

## 👤 **User API Endpoints**

### **3. Create User**

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john.doe@mereka.com",
    "name": "John Doe",
    "role": "user",
    "bio": "Test user bio",
    "phoneNumber": "+1234567890"
  }'
```

**Expected Response** (201 Created):

```json
{
  "success": true,
  "data": {
    "_id": "6905...",
    "email": "john.doe@mereka.com",
    "name": "John Doe",
    "role": "user",
    "status": "active",
    "emailVerified": false,
    "authProvider": "email",
    "authProviders": [],
    "bio": "Test user bio",
    "phoneNumber": "+1234567890",
    "createdAt": "2025-11-01T...",
    "updatedAt": "2025-11-01T..."
  },
  "message": "User created successfully"
}
```

---

### **4. Get All Users (Paginated)**

```bash
# Default (page 1, limit 20)
curl -X GET http://localhost:3000/api/v1/users

# With pagination
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=10"

# With filters
curl -X GET "http://localhost:3000/api/v1/users?role=admin&status=active"

# With search
curl -X GET "http://localhost:3000/api/v1/users?search=john"

# Combined
curl -X GET "http://localhost:3000/api/v1/users?page=1&limit=5&role=user&search=doe&sortBy=createdAt&sortOrder=desc"
```

**Expected Response**:

```json
{
  "success": true,
  "data": [
    {
      "_id": "6905...",
      "email": "john.doe@mereka.com",
      "name": "John Doe",
      ...
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "totalPages": 1
    }
  }
}
```

---

### **5. Get User by ID**

```bash
# Replace USER_ID with actual MongoDB ObjectId
curl -X GET http://localhost:3000/api/v1/users/6905a5637dbe09d64fa03bca
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "_id": "6905a5637dbe09d64fa03bca",
    "email": "john.doe@mereka.com",
    "name": "John Doe",
    ...
  }
}
```

**Error Response** (404 Not Found):

```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found"
  }
}
```

---

### **6. Update User**

```bash
# Replace USER_ID with actual ID
curl -X PATCH http://localhost:3000/api/v1/users/6905a5637dbe09d64fa03bca \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Updated",
    "bio": "Updated bio",
    "phoneNumber": "+9876543210"
  }'
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "data": {
    "_id": "6905...",
    "email": "john.doe@mereka.com",
    "name": "John Updated",
    "bio": "Updated bio",
    ...
  },
  "message": "User updated successfully"
}
```

---

### **7. Delete User (Soft Delete)**

```bash
# Replace USER_ID with actual ID
curl -X DELETE http://localhost:3000/api/v1/users/6905a5637dbe09d64fa03bca
```

**Expected Response** (200 OK):

```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Verify soft delete**:

```bash
# User still exists but status is 'inactive'
curl -X GET http://localhost:3000/api/v1/users/6905a5637dbe09d64fa03bca
# Check status field in response
```

---

## 🧪 **Complete Test Sequence**

Run this complete test flow:

```bash
echo "=== TEST 1: Health Check ==="
curl -s http://localhost:3000/health | python3 -m json.tool
echo -e "\n"

echo "=== TEST 2: API Info ==="
curl -s http://localhost:3000/ | python3 -m json.tool
echo -e "\n"

echo "=== TEST 3: Create User ==="
RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "role": "user"
  }')
echo $RESPONSE | python3 -m json.tool
USER_ID=$(echo $RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['_id'])")
echo "Created User ID: $USER_ID"
echo -e "\n"

echo "=== TEST 4: Get All Users ==="
curl -s http://localhost:3000/api/v1/users | python3 -m json.tool
echo -e "\n"

echo "=== TEST 5: Get User by ID ==="
curl -s http://localhost:3000/api/v1/users/$USER_ID | python3 -m json.tool
echo -e "\n"

echo "=== TEST 6: Update User ==="
curl -s -X PATCH http://localhost:3000/api/v1/users/$USER_ID \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated User", "bio": "New bio"}' | python3 -m json.tool
echo -e "\n"

echo "=== TEST 7: Delete User ==="
curl -s -X DELETE http://localhost:3000/api/v1/users/$USER_ID | python3 -m json.tool
echo -e "\n"

echo "=== TEST 8: Verify User Deleted (status = inactive) ==="
curl -s http://localhost:3000/api/v1/users/$USER_ID | python3 -m json.tool
```

---

## 🔍 **Validation Testing**

### **Test Invalid Email**

```bash
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "invalid-email",
    "name": "Test User"
  }'
```

**Expected**: 400 Bad Request with validation error

---

### **Test Duplicate Email**

```bash
# Create first user
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@test.com",
    "name": "First User"
  }'

# Try to create duplicate
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "duplicate@test.com",
    "name": "Second User"
  }'
```

**Expected**: 400 Bad Request - "User with this email already exists"

---

### **Test Invalid User ID**

```bash
curl -X GET http://localhost:3000/api/v1/users/invalid-id
```

**Expected**: 400 Bad Request - validation error

---

### **Test Non-Existent User**

```bash
curl -X GET http://localhost:3000/api/v1/users/507f1f77bcf86cd799439011
```

**Expected**: 404 Not Found

---

## 📊 **Pagination Testing**

```bash
# Create multiple users first
for i in {1..25}; do
  curl -s -X POST http://localhost:3000/api/v1/users \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"user$i@test.com\",\"name\":\"User $i\"}" > /dev/null
done

# Test pagination
echo "Page 1:"
curl -s "http://localhost:3000/api/v1/users?page=1&limit=10" | python3 -m json.tool | grep -E "(email|page|total)"

echo "Page 2:"
curl -s "http://localhost:3000/api/v1/users?page=2&limit=10" | python3 -m json.tool | grep -E "(email|page|total)"
```

---

## 🎨 **Pretty Print Responses**

### **With jq (if installed)**:

```bash
curl -s http://localhost:3000/api/v1/users | jq '.'
curl -s http://localhost:3000/health | jq '.status'
```

### **With python (built-in)**:

```bash
curl -s http://localhost:3000/api/v1/users | python3 -m json.tool
```

### **Save to file**:

```bash
curl -s http://localhost:3000/api/v1/users > users.json
cat users.json | python3 -m json.tool
```

---

## 🔧 **Useful curl Options**

```bash
# Show response headers
curl -i http://localhost:3000/health

# Show request and response details
curl -v http://localhost:3000/health

# Follow redirects
curl -L http://localhost:3000/health

# Save response to file
curl -o response.json http://localhost:3000/api/v1/users

# Show only HTTP status code
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health

# Include timing information
curl -w "\nTime: %{time_total}s\n" http://localhost:3000/health
```

---

## 📝 **Quick Test Script**

Save this as `test-api.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

echo "🧪 Testing Mereka Backend API"
echo "=============================="
echo ""

# Test 1: Health
echo "1️⃣  Health Check"
curl -s $BASE_URL/health | python3 -m json.tool | head -5
echo ""

# Test 2: Create User
echo "2️⃣  Create User"
CREATE_RESPONSE=$(curl -s -X POST $BASE_URL/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@mereka.com","name":"Test User","role":"user"}')

echo $CREATE_RESPONSE | python3 -m json.tool | head -10

# Extract user ID
USER_ID=$(echo $CREATE_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('data', {}).get('_id', 'none'))")
echo "User ID: $USER_ID"
echo ""

# Test 3: Get User
if [ "$USER_ID" != "none" ]; then
  echo "3️⃣  Get User by ID"
  curl -s $BASE_URL/api/v1/users/$USER_ID | python3 -m json.tool | head -10
  echo ""
fi

# Test 4: List Users
echo "4️⃣  List Users"
curl -s "$BASE_URL/api/v1/users?limit=5" | python3 -m json.tool | grep -E "(email|name|total)" | head -10
echo ""

echo "✅ Tests Complete!"
```

Make executable and run:

```bash
chmod +x test-api.sh
./test-api.sh
```

---

## 🎯 **Live Testing Commands**

Let me run actual tests on your server...
