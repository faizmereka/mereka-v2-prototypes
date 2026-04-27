# 🔐 Authentication Architecture - Mereka Platform

## Overview

Comprehensive authentication strategy for Mereka platform with:
- ✅ Multiple domains (mereka.io, app.mereka.io, auth.mereka.io)
- ✅ Firebase Auth (existing users)
- ✅ Email + Google login
- ✅ Future platform integrations
- ✅ Centralized auth service

---

## 🎯 Recommended Architecture: **Centralized Auth Service**

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend Domains                                             │
│  ├─ mereka.io (Marketing/Public)                             │
│  ├─ app.mereka.io (Application)                              │
│  └─ Other future domains                                     │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 │ Redirects to auth OR sends requests
                 ↓
┌──────────────────────────────────────────────────────────────┐
│  auth.mereka.io - Centralized Auth Service                   │
│  ├─ Login UI (Email, Google, etc.)                           │
│  ├─ Firebase Auth integration                                │
│  ├─ OAuth providers (Google, Facebook, etc.)                 │
│  ├─ Session management                                       │
│  ├─ Token generation & refresh                               │
│  └─ Returns: JWT or Session Cookie                           │
└────────────────┬─────────────────────────────────────────────┘
                 │ JWT Token or Session
                 ↓
┌──────────────────────────────────────────────────────────────┐
│  API Backend (api.mereka.io or backend.mereka.io)            │
│  ├─ Middleware: Verify Token                                 │
│  ├─ Extract user from token                                  │
│  ├─ Sync user to MongoDB (first request or on update)        │
│  ├─ Check permissions/roles                                  │
│  └─ Execute business logic                                   │
└──────────────────────────────────────────────────────────────┘
```

---

## 🏗️ **Detailed Architecture**

### **1. auth.mereka.io - Centralized Auth Service**

**Purpose**: Single source of truth for authentication

**Responsibilities**:
- Handle all login methods (Email, Google, Facebook, etc.)
- Integrate with Firebase Auth
- Generate secure tokens (JWT or session)
- Manage refresh tokens
- Handle logout
- Manage sessions across domains
- Future: Connect other platforms (Kajabi, custom SSO, etc.)

**Technology Options**:

#### **Option A: Firebase Auth + Custom Token Service** (Recommended)
```
auth.mereka.io
├─ Frontend: Login UI (React/Next.js)
├─ Backend: Node.js service
│  ├─ Firebase Admin SDK (verify Firebase tokens)
│  ├─ Custom JWT generation (your format)
│  └─ Token refresh endpoint
└─ Database: MongoDB (user sync + sessions)
```

**Flow**:
1. User logs in via Firebase (Email/Google)
2. Frontend gets Firebase ID token
3. Sends to auth.mereka.io/api/exchange-token
4. Backend verifies Firebase token
5. Syncs user to MongoDB
6. Generates custom JWT (your format, your claims)
7. Returns custom JWT + refresh token
8. Frontend stores tokens
9. Uses custom JWT for API calls

**Pros**:
- ✅ Keep Firebase Auth (no user migration needed)
- ✅ Full control over JWT structure
- ✅ Can add custom claims (roles, permissions)
- ✅ Works across all domains
- ✅ Easy to add more auth providers later

#### **Option B: Pure Firebase Auth** (Simpler)
```
auth.mereka.io
├─ Firebase Auth UI (firebaseui-web)
├─ Returns Firebase ID tokens directly
└─ Backend verifies Firebase tokens
```

**Flow**:
1. User logs in via Firebase
2. Frontend gets Firebase ID token
3. Frontend sends Firebase token to API
4. API verifies token with Firebase Admin SDK
5. API syncs user to MongoDB on first request

**Pros**:
- ✅ Simpler setup
- ✅ Firebase handles everything
- ✅ No custom token management

**Cons**:
- ⚠️ Less control over token structure
- ⚠️ Tied to Firebase token format
- ⚠️ Harder to add non-Firebase providers later

#### **Option C: Centralized Auth Service (Most Flexible)**
```
auth.mereka.io
├─ Custom auth service (Passport.js / next-auth)
├─ Multiple strategies:
│  ├─ Firebase (existing users)
│  ├─ Local (email/password)
│  ├─ OAuth (Google, Facebook, etc.)
│  └─ Future: SAML, OAuth2, Custom SSO
├─ Session store (Redis)
└─ Issues: Signed cookies OR JWT
```

**Pros**:
- ✅ Most flexible
- ✅ Easy to add new providers
- ✅ Centralized session management
- ✅ Can handle any auth method

**Cons**:
- ⚠️ More complex
- ⚠️ More code to maintain

---

## 🎯 **My Recommendation: Hybrid Approach**

### **Phase 1: Firebase Auth + Custom JWT** (Now)

Use Firebase Auth but issue custom JWTs for better control:

```typescript
// auth.mereka.io/api/auth/login
POST /api/auth/login
{
  "firebaseToken": "<firebase-id-token>"
}

// Backend:
1. Verify Firebase token with Admin SDK
2. Extract user info (uid, email, name, photo)
3. Sync user to MongoDB (upsert)
4. Generate custom JWT with your structure:
   {
     userId: "mongo-id",
     firebaseUid: "firebase-uid",
     email: "user@example.com",
     role: "user",
     domain: "app.mereka.io",
     customClaims: { /* your data */ }
   }
5. Return: { accessToken, refreshToken, user }
```

### **Phase 2: Add More Providers** (Later)

```typescript
// When adding new platforms:
POST /api/auth/login/kajabi
POST /api/auth/login/custom-platform
POST /api/auth/login/saml

// All return same JWT structure
```

---

## 🔧 **Implementation Details**

### **1. Environment Variables**

Add to `.env`:
```env
# Firebase Admin SDK
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY=your-private-key

# JWT Configuration
JWT_SECRET=your-super-secret-key-32-chars-minimum
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES=7d

# Domains
ALLOWED_ORIGINS=https://mereka.io,https://app.mereka.io,https://auth.mereka.io
AUTH_DOMAIN=auth.mereka.io
APP_DOMAIN=app.mereka.io

# Cookie Settings (for session-based auth alternative)
COOKIE_DOMAIN=.mereka.io
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

---

### **2. User Model Enhancement**

Update `User` model to include auth info:

```typescript
export interface IUser extends Document {
  // Existing fields...
  email: string;
  name: string;

  // Auth-specific fields
  firebaseUid?: string;         // Firebase user ID
  authProvider: AuthProvider;   // 'firebase' | 'email' | 'google' | 'kajabi'
  authProviders: AuthProvider[]; // Multiple auth methods

  // OAuth tokens (if needed)
  googleId?: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;

  // Session management
  refreshTokens?: string[];      // Active refresh tokens
  lastLoginAt?: Date;
  lastLoginMethod?: AuthProvider;

  // Security
  emailVerified: boolean;
  phoneVerified?: boolean;
  twoFactorEnabled?: boolean;
}

export enum AuthProvider {
  FIREBASE = 'firebase',
  EMAIL = 'email',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  KAJABI = 'kajabi',
  CUSTOM = 'custom'
}
```

---

### **3. Token Structure**

**Access Token** (Short-lived: 15 minutes):
```json
{
  "sub": "mongodb-user-id",
  "firebaseUid": "firebase-uid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "user",
  "permissions": ["read:own", "write:own"],
  "provider": "firebase",
  "domain": "app.mereka.io",
  "iat": 1234567890,
  "exp": 1234568790
}
```

**Refresh Token** (Long-lived: 7 days):
```json
{
  "sub": "mongodb-user-id",
  "type": "refresh",
  "tokenId": "unique-token-id",
  "iat": 1234567890,
  "exp": 1234972890
}
```

---

### **4. Multi-Domain Strategy**

#### **Option A: JWT in Authorization Header** (Recommended for API)
```typescript
// Frontend sends:
Authorization: Bearer <jwt-token>

// Works across all domains
// No cookie issues
// CORS friendly
```

#### **Option B: HttpOnly Cookies** (For web apps)
```typescript
// Set cookie with domain: .mereka.io
// Works across all subdomains
Set-Cookie: token=<jwt>; Domain=.mereka.io; Secure; HttpOnly; SameSite=Lax
```

#### **Option C: Hybrid** (Best of both)
```typescript
// Web apps: Use cookies
// Mobile/API: Use Authorization header
// Backend supports both
```

---

## 📁 **Proposed File Structure**

```
src/
├── auth/
│   ├── strategies/
│   │   ├── firebase.strategy.ts      # Firebase Auth verification
│   │   ├── email.strategy.ts         # Email/password (future)
│   │   ├── google.strategy.ts        # Google OAuth (direct)
│   │   └── custom.strategy.ts        # Custom providers
│   ├── services/
│   │   ├── auth.service.ts           # Main auth logic
│   │   ├── token.service.ts          # JWT generation/verification
│   │   ├── firebase-admin.service.ts # Firebase Admin SDK
│   │   └── user-sync.service.ts      # Sync Firebase → MongoDB
│   ├── middlewares/
│   │   ├── verify-token.middleware.ts    # Verify JWT
│   │   ├── verify-firebase.middleware.ts # Verify Firebase token
│   │   └── require-auth.middleware.ts    # Require authentication
│   ├── controllers/
│   │   ├── auth.controller.ts        # Login, logout, refresh
│   │   └── oauth.controller.ts       # OAuth callbacks
│   ├── routes/
│   │   └── auth.routes.ts            # Auth endpoints
│   └── types/
│       └── auth.types.ts             # Auth interfaces
```

---

## 🔄 **Authentication Flows**

### **Flow 1: Login with Firebase (Email/Google)**

```
┌─────────────┐
│   Frontend  │
│ (any domain)│
└──────┬──────┘
       │ 1. Redirect to auth.mereka.io/login
       ↓
┌──────────────────┐
│ auth.mereka.io   │
│  Login Page      │
└──────┬───────────┘
       │ 2. User enters email/password OR clicks Google
       ↓
┌──────────────────┐
│  Firebase Auth   │
│  (client SDK)    │
└──────┬───────────┘
       │ 3. Returns Firebase ID token
       ↓
┌──────────────────┐
│ auth.mereka.io   │
│  POST /api/auth/exchange-token
└──────┬───────────┘
       │ 4. Send Firebase token to backend
       ↓
┌──────────────────┐
│  Backend API     │
│  Verify & Sync   │
└──────┬───────────┘
       │ 5. Verify Firebase token (Admin SDK)
       │ 6. Sync user to MongoDB
       │ 7. Generate custom JWT
       ↓
┌──────────────────┐
│  Return Tokens   │
│  {               │
│    accessToken,  │
│    refreshToken, │
│    user          │
│  }               │
└──────┬───────────┘
       │ 8. Redirect back to app.mereka.io with token
       ↓
┌──────────────────┐
│  app.mereka.io   │
│  Store token     │
│  Make API calls  │
└──────────────────┘
```

---

### **Flow 2: API Request with Token**

```
Frontend (app.mereka.io)
  ↓ GET /api/v1/users
  ↓ Authorization: Bearer <jwt-token>
  ↓
API Backend
  ├─ Middleware: Verify JWT
  ├─ Extract user from token
  ├─ Load full user from MongoDB (if needed)
  ├─ Check permissions
  ├─ Execute business logic
  └─ Return response
```

---

### **Flow 3: Token Refresh**

```
Frontend detects token expired
  ↓ POST /api/auth/refresh
  ↓ { refreshToken: "<refresh-token>" }
  ↓
Backend
  ├─ Verify refresh token
  ├─ Check if revoked
  ├─ Generate new access token
  └─ Return new tokens
```

---

## 🎨 **Implementation Plan**

### **Phase 1: Firebase Auth Integration** (Immediate)

**Install Dependencies**:
```bash
npm install firebase-admin
npm install @fastify/cookie  # For cookies if needed
```

**Create**:
1. Firebase Admin SDK service
2. Token verification middleware
3. Auth routes (login, refresh, logout)
4. User sync service
5. Tests

---

### **Phase 2: Custom JWT** (Immediate)

**Benefits**:
- ✅ Your token format
- ✅ Your claims structure
- ✅ Independent of Firebase
- ✅ Can add any provider

**Implementation**:
```typescript
// Token Service
class TokenService {
  generateAccessToken(user: IUser): string {
    return jwt.sign(
      {
        sub: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        role: user.role,
        domain: 'app.mereka.io',
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );
  }

  generateRefreshToken(userId: string): string {
    const tokenId = uuidv4();
    return jwt.sign(
      { sub: userId, type: 'refresh', tokenId },
      JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
  }
}
```

---

### **Phase 3: Multi-Domain Support** (Immediate)

**CORS Configuration**:
```typescript
// src/plugins/cors.ts
await fastify.register(cors, {
  origin: [
    'https://mereka.io',
    'https://app.mereka.io',
    'https://auth.mereka.io',
    /\.mereka\.io$/  // All subdomains
  ],
  credentials: true,  // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
});
```

**Cookie Strategy** (if using cookies):
```typescript
// Set cookie that works across all subdomains
reply.setCookie('token', jwt, {
  domain: '.mereka.io',  // Works for all *.mereka.io
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});
```

---

### **Phase 4: Future Platform Integration** (Later)

**Extensible Design**:
```typescript
// Strategy pattern for auth providers
interface AuthStrategy {
  name: AuthProvider;
  verify(credentials: unknown): Promise<UserInfo>;
  sync(userInfo: UserInfo): Promise<IUser>;
}

// Implementations
class FirebaseAuthStrategy implements AuthStrategy { }
class KajabiAuthStrategy implements AuthStrategy { }
class CustomSSOStrategy implements AuthStrategy { }

// Usage
const strategies = {
  firebase: new FirebaseAuthStrategy(),
  kajabi: new KajabiAuthStrategy(),
  custom: new CustomSSOStrategy(),
};

// Login endpoint
POST /api/auth/login/:provider
// Routes to appropriate strategy
```

---

## 🔐 **Security Considerations**

### **1. Token Security**

**Access Tokens**:
- Short-lived (15 minutes)
- Stateless (no DB lookup needed)
- Include minimal data
- Signed with strong secret

**Refresh Tokens**:
- Long-lived (7 days)
- Store in MongoDB (can revoke)
- Rotate on use
- One-time use (optional)

### **2. Cross-Domain Security**

**CORS**:
```typescript
// Strict origin validation
const allowedOrigins = [
  'https://mereka.io',
  'https://app.mereka.io',
  'https://auth.mereka.io',
];

if (!allowedOrigins.includes(request.headers.origin)) {
  throw new Error('Unauthorized origin');
}
```

**CSRF Protection**:
```typescript
// For cookie-based auth
// Use @fastify/csrf-protection
```

### **3. Token Revocation**

**Store active refresh tokens**:
```typescript
// MongoDB
{
  userId: ObjectId,
  refreshTokenId: string,
  createdAt: Date,
  expiresAt: Date,
  revoked: boolean,
  userAgent: string,
  ipAddress: string
}

// On logout: mark as revoked
// On token refresh: check if revoked
```

---

## 📋 **Recommended API Endpoints**

### **Auth Service (auth.mereka.io/api)**

```typescript
// Authentication
POST   /auth/login/firebase          # Exchange Firebase token
POST   /auth/login/email              # Email/password (future)
POST   /auth/login/google             # Google OAuth (future)
POST   /auth/refresh                  # Refresh access token
POST   /auth/logout                   # Revoke tokens
GET    /auth/me                       # Get current user

// OAuth Callbacks (future)
GET    /auth/callback/google
GET    /auth/callback/facebook

// Admin endpoints
POST   /auth/admin/revoke-user        # Revoke all user tokens
POST   /auth/admin/revoke-token       # Revoke specific token
```

---

## 🎯 **Recommended Token Strategy**

### **For Your Use Case**:

**Use**: **Bearer JWT in Authorization Header**

**Why**:
- ✅ Works with mobile apps
- ✅ Works across domains (no cookie issues)
- ✅ Simpler CORS
- ✅ Stateless verification
- ✅ Industry standard

**Frontend**:
```typescript
// Store tokens in localStorage or sessionStorage
const accessToken = localStorage.getItem('accessToken');
const refreshToken = localStorage.getItem('refreshToken');

// Send with requests
fetch('https://api.mereka.io/api/v1/users', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// Refresh when expired
if (isTokenExpired(accessToken)) {
  const newTokens = await refreshAccessToken(refreshToken);
  localStorage.setItem('accessToken', newTokens.accessToken);
}
```

---

## 🚀 **Migration Strategy**

### **Step 1: Setup (Week 1)**
1. Add Firebase Admin SDK
2. Create token service
3. Create auth middleware
4. Update User model
5. Create auth routes

### **Step 2: Firebase Integration (Week 1-2)**
1. Verify Firebase tokens work
2. Sync users to MongoDB
3. Generate custom JWTs
4. Test with existing users

### **Step 3: Multi-Domain (Week 2)**
1. Configure CORS for all domains
2. Test token flow across domains
3. Handle auth.mereka.io redirects
4. Test session management

### **Step 4: Future Providers (Later)**
1. Design strategy pattern
2. Add new auth providers as needed
3. Maintain backward compatibility

---

## 💡 **Immediate Next Steps**

Should I now:

**A. Implement Firebase Auth + Custom JWT** (Recommended)
- Add Firebase Admin SDK
- Create auth middleware
- Create token service
- Create auth routes
- Update User model
- Write tests

**B. Create auth.mereka.io Service** (Separate project)
- New Next.js/Node.js project
- Firebase Auth UI
- Token exchange API
- Redirect handling

**C. Document First, Implement Later**
- Create detailed technical spec
- Review auth flow diagrams
- Plan database schema changes
- Then build

What would you like me to do next?
