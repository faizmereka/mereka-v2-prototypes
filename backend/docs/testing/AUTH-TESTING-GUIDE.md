# 🧪 Auth Endpoints Testing Guide

## Testing ONLY Auth-Related Endpoints (auth.mereka.io integration)

**Based on**: mereka-web-17/projects/auth analysis

---

## 🎯 **Auth Endpoints to Test** (13 total)

### **Core Auth** (4 endpoints - Already Working):

```bash
# 1. Login with Firebase token
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseToken": "<firebase-id-token>",
    "domain": "app.mereka.io"
  }'

# 2. Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh-token>"}'

# 3. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"refreshToken": "<refresh-token>"}'

# 4. Get current user
curl http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access-token>"
```

### **Firebase Compatibility** (3 endpoints - NEW):

```bash
# 5. Create session cookie (replaces Firebase Function)
curl -X POST http://localhost:3000/api/v1/auth/session-cookie \
  -H "Content-Type: application/json" \
  -d '{"token": "<firebase-id-token>"}'

# 6. Create custom token (replaces Firebase Function)
curl -X POST http://localhost:3000/api/v1/auth/custom-token \
  -H "Content-Type: application/json" \
  -d '{"sessionCookie": "<session-cookie-from-step-5>"}'

# 7. Get user status (replaces Firestore query)
curl "http://localhost:3000/api/v1/auth/user-status?email=user@example.com"
```

### **Magic Link** (2 endpoints - NEW):

```bash
# 8. Send magic link email
curl -X POST http://localhost:3000/api/v1/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "redirectUrl": "https://app.mereka.io"
  }'

# 9. Verify magic link
curl -X POST http://localhost:3000/api/v1/auth/verify-magic-link \
  -H "Content-Type: application/json" \
  -d '{"token": "<magic-link-token-from-email>"}'
```

### **Password Reset** (2 endpoints - NEW):

```bash
# 10. Send password reset email
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'

# 11. Reset password
curl -X POST http://localhost:3000/api/v1/auth/reset-password \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<reset-token-from-email>",
    "newPassword": "newPassword123"
  }'
```

### **Profile Management** (2 endpoints - NEW):

```bash
# 12. Complete profile
curl -X POST http://localhost:3000/api/v1/auth/complete-profile \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "currency": "IDR",
    "timeZone": "Asia/Jakarta",
    "locale": "id",
    "isGuestSignup": false
  }'

# 13. Update own profile
curl -X PATCH http://localhost:3000/api/v1/users/me \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "bio": "My bio"
  }'
```

---

## ✅ **Quick Test - No Auth Required**

These work without Firebase tokens:

```bash
# Test 1: User Status
curl "http://localhost:3000/api/v1/auth/user-status?email=test@mereka.com"

# Expected:
# {"success":true,"data":{"exists":true/false,"isGuest":false,"hasPassword":false,"authProviders":[]}}

# Test 2: Magic Link (will log email in dev mode)
curl -X POST http://localhost:3000/api/v1/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mereka.com"}'

# Expected:
# {"success":true,"message":"Magic link sent to your email"}
# Check console - email will be logged in development

# Test 3: Forgot Password
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mereka.com"}'

# Expected:
# {"success":true,"message":"If an account exists, a password reset email has been sent"}
```

---

## 🎬 **Complete Auth Flow Test**

Run this to test the full flow:

```bash
#!/bin/bash

echo "=== AUTH ENDPOINTS TEST ==="
echo ""

echo "1. Check user status"
curl -s "http://localhost:3000/api/v1/auth/user-status?email=test@mereka.com"
echo -e "\n"

echo "2. Send magic link"
curl -s -X POST http://localhost:3000/api/v1/auth/magic-link \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mereka.com","redirectUrl":"https://app.mereka.io"}'
echo -e "\n"

echo "3. Send password reset"
curl -s -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mereka.com"}'
echo -e "\n"

echo "=== All auth endpoints available! ==="
```

---

## 📝 **Environment URLs**

From `mereka-web-17` environment config:

```
Production:
- Auth: https://auth.mereka.io
- App: https://app.mereka.io
- Main: https://mereka.io
- Checkout: https://checkout.mereka.io

Development:
- All: http://localhost:4200
```

These are already configured in your `.env`!

---

## 🚀 **Start Testing**

```bash
# Start server
npm run dev

# Test in browser
open http://localhost:3000/docs

# Or use curl
curl http://localhost:3000/api/v1/auth/user-status?email=test@test.com
```

**All 13 auth endpoints ready for testing!** ✅
