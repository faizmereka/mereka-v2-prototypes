# 📖 Mereka Auth API Documentation

**Version**: 2.1
**Status**: Production Ready
**Last Updated**: November 3, 2025

---

## 🚀 Quick Start

```bash
# Start server
npm run dev

# Test API
Open: http://localhost:3000/docs (Swagger UI)
Or use: ../../../test-auth.http (REST Client)
```

---

## 📋 API Endpoints (9 Total)

### Core Authentication (6 endpoints)

- `GET  /auth/user-status` - Check user status
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login with email/password
- `POST /auth/login/social` - Login with social account
- `POST /auth/refresh` - Refresh access token
- `GET  /auth/me` - Get current user

### Password Management (3 endpoints)

- `POST /auth/change-password` - Change password (logged-in)
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset with token

---

## 📖 Detailed Endpoint Documentation

### 1. GET /api/v1/auth/user-status

**Purpose**: Check if user exists and get recommended authentication flow

**Request**:

```
GET /api/v1/auth/user-status?email=user@example.com
```

**Response**:

```json
{
  "success": true,
  "data": {
    "exists": false,
    "isNewUser": true,
    "hasPassword": false,
    "hasSocialAuth": false,
    "authProviders": [],
    "recommendedAction": "register"
  }
}
```

**recommendedAction values:**

- `"register"` - New user → Show registration form
- `"login-password"` - Existing user with password → Show password field
- `"login-social"` - Existing user with social only → Show social buttons

---

### 2. POST /api/v1/auth/register

**Purpose**: Register new user

**Request**:

```json
{
  "name": "John Doe",
  "email": "john@mereka.io",
  "birthDate": "15/08/1990",
  "password": "securepass123",
  "confirmPassword": "securepass123",
  "currency": "USD",
  "timeZone": "America/New_York",
  "locale": "en"
}
```

**Required Fields:**

- `name` - Full name (2-100 chars)
- `email` - Valid email
- `birthDate` - dd/mm/yyyy format
- `password` - Min 8 chars
- `confirmPassword` - Must match password

**Optional Fields:**

- `currency` (default: IDR)
- `timeZone` (default: Asia/Jakarta)
- `locale` (default: en)

**Response (201 Created)**:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "email": "john@mereka.io",
      "name": "John Doe",
      "birthDate": "1990-08-15T00:00:00.000Z",
      "role": "user",
      "emailVerified": false,
      "authProvider": "email"
    },
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  },
  "message": "Registration successful"
}
```

**Cookies Set:**

- `accessToken` (15 min, httpOnly, domain=.mereka.io)
- `refreshToken` (7 days, httpOnly, domain=.mereka.io)

---

### 3. POST /api/v1/auth/login

**Purpose**: Login with email and password

**Request**:

```json
{
  "email": "john@mereka.io",
  "password": "securepass123"
}
```

**Response**: Same as register (user + tokens + cookies)

---

### 4. POST /api/v1/auth/login/social

**Purpose**: Login with social account (Google, Facebook)

**Request**:

```json
{
  "firebaseToken": "eyJhbGc...",
  "domain": "app.mereka.io"
}
```

**Response**: Same format (user + tokens + cookies)

**How to get Firebase token:**

```typescript
// Frontend: After Firebase OAuth
const result = await signInWithPopup(auth, new GoogleAuthProvider());
const firebaseToken = await result.user.getIdToken();
```

---

### 5. POST /api/v1/auth/refresh

**Purpose**: Refresh expired access token

**Request**:

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "tokens": {
      "accessToken": "eyJhbGc...",
      "refreshToken": "eyJhbGc...",
      "expiresIn": 900
    }
  }
}
```

**Note**: Old refresh token is revoked, new one issued (token rotation)

---

### 6. GET /api/v1/auth/me

**Purpose**: Get current logged-in user information

**Request**:

```
GET /api/v1/auth/me
Authorization: Bearer <accessToken>
```

**Response**:

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "john@mereka.io",
    "name": "John Doe",
    "birthDate": "1990-08-15T00:00:00.000Z",
    "role": "user",
    "status": "active",
    "emailVerified": false,
    "authProvider": "email",
    "lastLoginAt": "2025-11-03T..."
  }
}
```

---

## 🍪 Multi-Domain Cookie Support

### How It Works

**All login/register endpoints automatically set cookies:**

```
Set-Cookie: accessToken=eyJhbGc...;
  Domain=.mereka.io;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Max-Age=900

Set-Cookie: refreshToken=eyJhbGc...;
  Domain=.mereka.io;
  HttpOnly;
  Secure;
  SameSite=Lax;
  Max-Age=604800
```

### Benefits

✅ **Shared across all \*.mereka.io domains:**

- auth.mereka.io
- app.mereka.io
- mereka.io

✅ **Security:**

- `httpOnly` - JavaScript cannot access (XSS protection)
- `secure` - HTTPS only in production
- `sameSite: lax` - CSRF protection

✅ **User Experience:**

- Login at auth.mereka.io
- Redirect to app.mereka.io
- Cookies automatically sent!

---

## 🔐 Token System

### Access Token

- **Lifetime**: 15 minutes
- **Use**: API authentication
- **Header**: `Authorization: Bearer <token>`
- **Storage**: httpOnly cookie + response JSON

### Refresh Token

- **Lifetime**: 7 days
- **Use**: Get new access tokens
- **Storage**: httpOnly cookie + MongoDB + response JSON
- **Revocable**: Stored in database, can be revoked

### Why Two Tokens?

- Access token short-lived = Less damage if stolen
- Refresh token revocable = Can logout all devices
- Token rotation = Security best practice

---

## 🔄 Complete Authentication Flow

### New User Registration

```
1. User enters email
   ↓
2. GET /auth/user-status
   → recommendedAction: "register"
   ↓
3. Show registration form
   ↓
4. POST /auth/register
   { name, email, birthDate, password, confirmPassword }
   ↓
5. Backend:
   - Validates inputs
   - Hashes password (bcrypt)
   - Creates user in MongoDB
   - Generates JWT tokens
   - Sets httpOnly cookies
   - Returns user + tokens
   ↓
6. Frontend:
   - Cookies set automatically
   - Redirect to app.mereka.io
   - User is logged in!
```

### Existing User Login

```
1. User enters email
   ↓
2. GET /auth/user-status
   → recommendedAction: "login-password"
   → name: "John Doe"
   ↓
3. Show: "Welcome back, John!" + password field
   ↓
4. POST /auth/login
   { email, password }
   ↓
5. Backend validates & sets cookies
   ↓
6. Redirect to app → Logged in!
```

---

## 🧪 Testing

### Option 1: Swagger UI

```
http://localhost:3000/docs
```

- Visual interface
- Try all endpoints
- See responses

### Option 2: REST Client (VS Code)

```
Open: test-auth.http
Click "Send Request" above each endpoint
```

### Option 3: cURL

```bash
# Register
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@mereka.io",
    "birthDate": "15/08/1995",
    "password": "test123456",
    "confirmPassword": "test123456"
  }'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@mereka.io",
    "password": "test123456"
  }'
```

---

## 🌐 Frontend Integration

### Angular Example

```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1';

  // Check user status
  async getUserStatus(email: string) {
    return this.http
      .get<any>(
        `${this.apiUrl}/auth/user-status?email=${email}`,
        { withCredentials: true }, // Enable cookies!
      )
      .toPromise();
  }

  // Register
  async register(data: {
    name: string;
    email: string;
    birthDate: string; // dd/mm/yyyy
    password: string;
    confirmPassword: string;
  }) {
    return this.http
      .post<any>(
        `${this.apiUrl}/auth/register`,
        data,
        { withCredentials: true }, // Enable cookies!
      )
      .toPromise();
  }

  // Login
  async login(email: string, password: string) {
    return this.http
      .post<any>(
        `${this.apiUrl}/auth/login`,
        { email, password },
        { withCredentials: true }, // Enable cookies!
      )
      .toPromise();
  }

  // Get current user
  async getMe() {
    return this.http
      .get<any>(
        `${this.apiUrl}/auth/me`,
        { withCredentials: true }, // Cookies sent automatically!
      )
      .toPromise();
  }
}
```

**Important**: Always use `withCredentials: true` to send/receive cookies!

---

## 📊 Project Structure

```
mereka-backend-v2-elevate-ref/
├── src/
│   ├── controllers/
│   │   └── auth.controller.ts      (All 6 endpoints)
│   ├── services/
│   │   ├── auth.service.ts         (Main logic)
│   │   ├── password.service.ts     (bcrypt)
│   │   └── token.service.ts        (JWT)
│   ├── schemas/
│   │   └── auth.schema.ts          (Validation)
│   └── models/
│       └── User.ts                 (User model)
│
├── README.md                       (Project overview)
├── API-DOCUMENTATION.md            (This file - Complete API docs)
├── test-auth.http                  (REST Client tests)
└── package.json
```

**Clean & Minimal!** Only essential files.

---

## 🔒 Security Features

- ✅ bcrypt password hashing (10 rounds)
- ✅ Password confirmation validation
- ✅ Birth date validation (dd/mm/yyyy)
- ✅ JWT access + refresh tokens
- ✅ httpOnly cookies (XSS protection)
- ✅ Token rotation on refresh
- ✅ Multi-domain support
- ✅ HTTPS only in production
- ✅ Input validation with Zod

---

## ⚙️ Configuration

### .env File

```env
# Server
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# Database
MONGODB_URI=your_mongodb_uri

# JWT
JWT_SECRET=your_secret_minimum_32_characters
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES=7d

# Cookies
COOKIE_DOMAIN=.mereka.io

# CORS
CORS_ORIGIN=*
API_PREFIX=/api/v1
```

---

## 🚀 Deployment

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Set `COOKIE_DOMAIN=.mereka.io`
- [ ] Use strong `JWT_SECRET`
- [ ] Configure production MongoDB URI
- [ ] Enable HTTPS
- [ ] Set proper CORS origins
- [ ] Review security settings

---

**Complete documentation - Ready for mereka-web-17 integration!** 🎉
