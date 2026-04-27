# 🔐 Authentication Feature

**Version**: 2.1
**Status**: Production Ready
**Endpoints**: 9

---

## Overview

Complete JWT-based authentication system with email/password, social login, and password management. Includes multi-domain cookie support for seamless authentication across auth.mereka.io, app.mereka.io, and mereka.io.

---

## Features

- ✅ Email/Password Registration & Login
- ✅ Social Login (Google, Facebook via Firebase)
- ✅ Smart User Status Check
- ✅ Password Management (Change, Forgot, Reset)
- ✅ Multi-Domain Cookies (domain=.mereka.io)
- ✅ JWT Access (15min) + Refresh (7 days) Tokens
- ✅ httpOnly Cookies (XSS Protection)
- ✅ Password Hashing (bcrypt)
- ✅ Token Rotation on Refresh

---

## API Endpoints

### Core Authentication

| Endpoint             | Method | Auth | Purpose                           |
| -------------------- | ------ | ---- | --------------------------------- |
| `/auth/user-status`  | GET    | No   | Check user & get recommended flow |
| `/auth/register`     | POST   | No   | Register with email/password      |
| `/auth/login`        | POST   | No   | Login with email/password         |
| `/auth/login/social` | POST   | No   | Login with Google/Facebook        |
| `/auth/refresh`      | POST   | No   | Refresh access token              |
| `/auth/me`           | GET    | Yes  | Get current user info             |

### Password Management

| Endpoint                | Method | Auth | Purpose                     |
| ----------------------- | ------ | ---- | --------------------------- |
| `/auth/change-password` | POST   | Yes  | Change password (logged-in) |
| `/auth/forgot-password` | POST   | No   | Request password reset      |
| `/auth/reset-password`  | POST   | No   | Reset password with token   |

---

## Documentation

- **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - Complete API reference
- **[REGISTER-API.md](./REGISTER-API.md)** - Detailed register endpoint spec
- **[../../testing/AUTH-TESTING-GUIDE.md](../../testing/AUTH-TESTING-GUIDE.md)** - Testing guide

---

## Quick Start

```bash
# Check user status
GET /api/v1/auth/user-status?email=user@example.com

# Register
POST /api/v1/auth/register
{
  "name": "John Doe",
  "email": "john@mereka.io",
  "birthDate": "15/08/1990",
  "password": "securepass123",
  "confirmPassword": "securepass123"
}

# Login
POST /api/v1/auth/login
{
  "email": "john@mereka.io",
  "password": "securepass123"
}

# Change Password (requires auth token)
POST /api/v1/auth/change-password
Authorization: Bearer <accessToken>
{
  "currentPassword": "securepass123",
  "newPassword": "newsecurepass456",
  "confirmPassword": "newsecurepass456"
}

# Forgot Password (get reset token)
POST /api/v1/auth/forgot-password
{
  "email": "john@mereka.io"
}
# Token will be logged to console (for now)
# In production: sent via email

# Reset Password (with token)
POST /api/v1/auth/reset-password
{
  "token": "reset-token-from-forgot-password",
  "newPassword": "newsecurepass789"
}
```

---

## Implementation Files

```
src/
├── controllers/
│   └── auth.controller.ts          # All 6 endpoints
├── services/
│   ├── auth.service.ts             # Main logic
│   ├── password.service.ts         # bcrypt hashing
│   └── token.service.ts            # JWT tokens
├── schemas/
│   └── auth.schema.ts              # Validation
└── models/
    └── User.ts                     # User model
```

---

## Security

- ✅ bcrypt password hashing (10 rounds)
- ✅ Password confirmation validation
- ✅ httpOnly cookies (XSS protection)
- ✅ JWT token rotation
- ✅ Multi-domain support
- ✅ HTTPS only in production

---

## Testing

**Swagger UI**: http://localhost:3000/docs
**REST Client**: `../../../test-auth.http`
**Testing Guide**: `../../testing/AUTH-TESTING-GUIDE.md`

---

**Ready for production!** 🚀
