# Authentication Module Documentation

## Overview

The Mereka authentication module provides a comprehensive authentication system supporting multiple authentication methods:

- **Email + Password** - Traditional email/password login
- **OTP (One-Time Password)** - Passwordless email verification
- **Social Login** - Google, Facebook, Apple sign-in via Firebase
- **Password Setup** - For migrated users or social login users to set up password

## Authentication Flows

### 1. Email + Password Flow (Existing Users with Password)

```
User enters email → Check email status → User has password → Enter password → Login
```

**Steps:**
1. User enters email address
2. System calls `GET /auth/check-email?email=xxx`
3. If `hasPassword: true` → Show password input
4. User enters password
5. System calls `POST /auth/login` with email/password
6. On success → Redirect to app

### 2. OTP (Passwordless) Flow

```
User enters email → Select OTP → Send OTP → Enter code → Verify → Login
```

**Steps:**
1. User enters email address
2. User clicks "Email me a one-time code"
3. System calls `POST /auth/otp/send`
4. User receives 6-digit code via email
5. User enters code
6. System calls `POST /auth/otp/verify`
7. On success → Redirect to app (creates user if new)

### 3. Password Setup Flow (For Users Without Password)

```
User enters email → Select password → Check email → No password →
Send OTP → Verify OTP → Set password → Login
```

**Steps:**
1. User enters email address
2. User clicks "Use password"
3. System calls `GET /auth/check-email?email=xxx`
4. If `hasPassword: false` (Firebase migrated or OTP-only user):
   - System calls `POST /auth/otp/send`
   - User enters OTP code
   - System calls `POST /auth/otp/verify`
   - User is shown password setup form
   - System calls `POST /auth/setup-password`
5. On success → Redirect to app

### 4. Social Login Flow

```
Click social button → Firebase popup → Get token → Backend auth → Login
```

**Steps:**
1. User clicks Google/Facebook/Apple button
2. Firebase popup opens for authentication
3. On success, get Firebase ID token
4. System calls `POST /auth/login/social` with Firebase token
5. Backend verifies token, creates/updates user
6. On success → Redirect to app

### 5. Forgot Password Flow

```
Click forgot password → Enter email → Receive reset link →
Click link → Enter new password → Login
```

**Steps:**
1. User clicks "Forgot password?" on sign-in screen
2. User enters email address
3. System calls `POST /auth/forgot-password`
4. User receives email with reset link
5. User clicks link (with token and oobCode)
6. User enters new password
7. System calls `POST /auth/reset-password`
8. On success → Redirect to sign in

### 6. New User Registration Flow

```
User enters email → Check email → User doesn't exist →
Select password → Fill registration form → Register → Login
```

**Steps:**
1. User enters email address
2. User clicks "Use password"
3. System calls `GET /auth/check-email?email=xxx`
4. If `exists: false` → Show registration form
5. User fills name, birth date, password
6. System calls `POST /auth/register`
7. On success → Redirect to app

---

## API Endpoints

### Check Email Status
```
GET /auth/check-email?email={email}

Response:
{
  "success": true,
  "data": {
    "exists": boolean,
    "hasPassword": boolean,
    "authProviders": ["email", "google", "facebook", "firebase"]
  }
}
```

### Send OTP
```
POST /auth/otp/send
Body: { "email": "user@example.com" }

Response:
{
  "success": true,
  "data": {
    "message": "OTP sent successfully",
    "expiresIn": 600  // seconds
  }
}
```

### Verify OTP
```
POST /auth/otp/verify
Body: { "email": "user@example.com", "otp": "123456" }

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { "accessToken": "...", "refreshToken": "...", "expiresIn": 900 }
  }
}
```

### Setup Password
```
POST /auth/setup-password
Body: {
  "email": "user@example.com",
  "password": "newPassword123",
  "confirmPassword": "newPassword123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  },
  "message": "Password setup successful"
}
```

### Login with Email/Password
```
POST /auth/login
Body: { "email": "user@example.com", "password": "password123" }

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

### Login with Social (Firebase)
```
POST /auth/login/social
Body: { "firebaseToken": "...", "domain": "app.mereka.io" }

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

### Register New User
```
POST /auth/register
Body: {
  "name": "John Doe",
  "email": "user@example.com",
  "birthDate": "15/03/1990",  // dd/mm/yyyy
  "password": "password123",
  "confirmPassword": "password123"
}

Response:
{
  "success": true,
  "data": {
    "user": { ... },
    "tokens": { ... }
  }
}
```

### Forgot Password
```
POST /auth/forgot-password
Body: { "email": "user@example.com" }

Response:
{
  "success": true,
  "message": "If an account exists, a password reset email has been sent"
}
```

### Reset Password
```
POST /auth/reset-password
Body: { "token": "...", "newPassword": "newPassword123" }

Response:
{
  "success": true,
  "message": "Password reset successfully"
}
```

---

## Frontend Components

### Component Structure

```
auth/
├── components/
│   ├── auth-base-layout/          # Base layout with branding
│   ├── auth-body/                 # Main container, mode switching
│   ├── auth-body-email/           # Email input + method selection
│   ├── auth-body-otp/             # OTP verification
│   ├── auth-body-sign-in/         # Password sign-in
│   ├── auth-body-sign-up/         # Registration form
│   ├── auth-body-forgot-password/ # Request password reset
│   ├── auth-body-update-password/ # Reset password with token
│   └── auth-body-setup-password/  # First-time password setup
└── pages/
    └── auth/                      # Main auth page
```

### Auth Modes

The `auth-body` component manages different authentication states:

| Mode | Description |
|------|-------------|
| `''` (empty) | Social login buttons |
| `email` | Email input + method selection |
| `otp` | OTP verification for login |
| `otp-setup` | OTP verification for password setup |
| `sign-in` | Password login |
| `sign-up` | New user registration |
| `forgot-password` | Request password reset |
| `resetPassword` | Enter new password (from email link) |
| `setup-password` | Set up password (after OTP verification) |

### Component Flow Diagram

```
                    ┌─────────────────┐
                    │   Social Login  │
                    │ (Google/FB/Apple)│
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   auth-body     │
                    │   (mode: '')    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐         ┌────────▼────────┐
    │  Continue with    │         │  Social Login   │
    │      Email        │         │    Success      │
    └─────────┬─────────┘         └────────┬────────┘
              │                             │
    ┌─────────▼─────────┐                   │
    │  auth-body-email  │                   │
    │  (mode: 'email')  │                   │
    └─────────┬─────────┘                   │
              │                             │
    ┌─────────┴─────────┐                   │
    │                   │                   │
    ▼                   ▼                   │
  OTP              Password                 │
    │                   │                   │
    │         ┌─────────▼─────────┐         │
    │         │  check-email API  │         │
    │         └─────────┬─────────┘         │
    │                   │                   │
    │     ┌─────────────┼─────────────┐     │
    │     │             │             │     │
    │     ▼             ▼             ▼     │
    │  No User    Has Password   No Password│
    │     │             │             │     │
    │     ▼             ▼             │     │
    │  sign-up      sign-in           │     │
    │     │             │             │     │
    │     │             │      ┌──────┴─────┐
    │     │             │      │ Send OTP   │
    │     │             │      └──────┬─────┘
    │     │             │             │
    ▼     │             │      ┌──────▼─────┐
  ┌───────┴─────────────┴──────│  otp-setup │
  │       OTP Verification     └──────┬─────┘
  │                                   │
  │                            ┌──────▼──────┐
  │                            │setup-password│
  │                            └──────┬──────┘
  │                                   │
  └───────────────┬───────────────────┘
                  │
          ┌───────▼───────┐
          │   Redirect    │
          │   to App      │
          └───────────────┘
```

---

## User Types & Auth Providers

### Auth Providers

| Provider | Description |
|----------|-------------|
| `email` | Registered with email/password |
| `google` | Signed in via Google |
| `facebook` | Signed in via Facebook |
| `firebase` | Migrated from Firebase (legacy) |
| `custom` | Custom auth method |

### User Scenarios

1. **New User (OTP)** - Signs up via OTP, no password
   - `authProviders: ['email']`
   - `password: null`
   - `isGuestSignup: true`

2. **New User (Password)** - Signs up with password
   - `authProviders: ['email']`
   - `password: [hashed]`

3. **Social Login User** - Signs in via Google/Facebook/Apple
   - `authProviders: ['google']` (or facebook)
   - `password: null`

4. **Firebase Migrated User** - Migrated from old Firebase system
   - `authProviders: ['firebase']`
   - `password: null`
   - `firebaseId: [original-id]`

5. **Multi-Provider User** - Has multiple auth methods
   - `authProviders: ['email', 'google']`
   - `password: [hashed]`

---

## Security Features

### OTP Security
- **6-digit codes** - Cryptographically generated
- **Hashed storage** - OTP stored as SHA-256 hash
- **Expiration** - OTPs expire after 10 minutes
- **Rate limiting** - Max 3 active OTPs per email
- **Attempt limiting** - Max 5 failed attempts per OTP

### Password Security
- **Minimum length** - 8 characters required
- **Secure hashing** - bcrypt with salt rounds
- **Reset tokens** - JWT with 1-hour expiration

### Session Security
- **Access tokens** - 15-minute expiration
- **Refresh tokens** - 7-day expiration
- **HTTP-only cookies** - Tokens stored in secure cookies
- **CORS** - Configured for specific domains

---

## Error Codes

| Code | Description |
|------|-------------|
| `LOGIN_FAILED` | Invalid email or password |
| `USER_ALREADY_EXISTS` | Email already registered |
| `REGISTRATION_FAILED` | Registration error |
| `INVALID_OTP` | Wrong or expired OTP |
| `TOO_MANY_ATTEMPTS` | OTP attempt limit reached |
| `RATE_LIMITED` | Too many OTP requests |
| `PASSWORD_EXISTS` | User already has password |
| `PASSWORD_MISMATCH` | Passwords don't match |
| `NETWORK_ERROR` | Connection failed |
| `RESET_PASSWORD_FAILED` | Invalid/expired reset token |

---

## Environment Configuration

### Frontend (auth.mereka.io)
```typescript
// environment.ts
export const environment = {
  apiUrl: 'https://api.mereka.io/api/v1',
  firebase: {
    apiKey: '...',
    authDomain: '...',
    projectId: '...',
  }
};
```

### Backend
```env
# JWT Configuration
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Cookie Domain (for cross-subdomain)
COOKIE_DOMAIN=.mereka.io

# Firebase Admin
FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY=...
```

---

## Testing

### Test Accounts
For development, OTP codes are logged to console:
```
📧 OTP LOGIN REQUEST
Email: test@example.com
OTP: 123456
Valid for: 10 minutes
```

### API Testing
Use the following curl commands:

```bash
# Check email status
curl -X GET "http://localhost:3000/api/v1/auth/check-email?email=test@example.com"

# Send OTP
curl -X POST "http://localhost:3000/api/v1/auth/otp/send" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Verify OTP
curl -X POST "http://localhost:3000/api/v1/auth/otp/verify" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'

# Setup password
curl -X POST "http://localhost:3000/api/v1/auth/setup-password" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","confirmPassword":"password123"}'
```

---

## Migration Notes

### Firebase Users
Users migrated from Firebase have:
- `firebaseId` - Original Firebase document ID
- `authProviders: ['firebase']`
- No password set

When these users try to use password login:
1. System detects `hasPassword: false`
2. Prompts for OTP verification
3. After OTP, prompts to set up password
4. Password is saved, `email` added to `authProviders`

---

*Last updated: December 2024*
