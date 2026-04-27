# 📝 Register API - Complete Specification

## POST /api/v1/auth/register

**Purpose**: Create a new user account with email and password

---

## 📋 Request Body

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "birthDate": "15/08/1990",
  "password": "securepass123",
  "confirmPassword": "securepass123",
  "currency": "USD",
  "timeZone": "America/New_York",
  "locale": "en"
}
```

### Required Fields ✅

1. **name** (string, 2-100 chars)
   - User's full name
   - Example: "John Doe"

2. **email** (string, valid email)
   - User's email address
   - Example: "john@example.com"
   - Stored as lowercase

3. **birthDate** (string, dd/mm/yyyy format)
   - User's date of birth
   - Format: **dd/mm/yyyy**
   - Example: "15/08/1990" (15th August 1990)
   - Validation: Must match `\d{2}/\d{2}/\d{4}` pattern

4. **password** (string, 8-128 chars)
   - User's password
   - Minimum 8 characters
   - Maximum 128 characters
   - Will be hashed with bcrypt

5. **confirmPassword** (string, min 8 chars)
   - Must match password field exactly
   - Validation error if passwords don't match

### Optional Fields

6. **currency** (string)
   - Preferred currency code
   - Default: "IDR"
   - Example: "USD", "EUR", "IDR"

7. **timeZone** (string)
   - User's timezone
   - Default: "Asia/Jakarta"
   - Example: "America/New_York", "UTC"

8. **locale** (string)
   - User's locale/language
   - Default: "en"
   - Example: "en", "id"

---

## ✅ Success Response (201 Created)

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "690822d563b25def3f2f991b",
      "email": "john@example.com",
      "name": "John Doe",
      "birthDate": "1990-08-15T00:00:00.000Z",
      "role": "user",
      "emailVerified": false,
      "avatar": null,
      "authProvider": "email"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": 900
    }
  },
  "message": "Registration successful"
}
```

### Response Fields

**User Object:**

- `id` - User ID (MongoDB ObjectId)
- `email` - User's email (lowercase)
- `name` - User's full name
- `birthDate` - Birth date as ISO string
- `role` - User role (default: "user")
- `emailVerified` - Email verification status (false initially)
- `avatar` - Avatar URL (null initially)
- `authProvider` - Auth method used ("email")

**Tokens Object:**

- `accessToken` - JWT token (valid 15 minutes)
- `refreshToken` - JWT token (valid 7 days)
- `expiresIn` - Access token expiration in seconds (900 = 15 min)

### Cookies Set (Multi-Domain)

Backend automatically sets two httpOnly cookies:

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

**Benefits:**

- ✅ Works across auth.mereka.io, app.mereka.io, mereka.io
- ✅ httpOnly = Cannot be accessed by JavaScript (XSS protection)
- ✅ Auto-sent with all requests

---

## ❌ Error Responses

### 409 - User Already Exists

```json
{
  "success": false,
  "error": {
    "code": "USER_ALREADY_EXISTS",
    "message": "User with this email already exists"
  }
}
```

### 400 - Validation Error (Passwords Don't Match)

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "_errors": [],
      "confirmPassword": {
        "_errors": ["Passwords do not match"]
      }
    }
  }
}
```

### 400 - Invalid Birth Date Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "birthDate": {
        "_errors": ["Birth date must be in dd/mm/yyyy format"]
      }
    }
  }
}
```

### 400 - Password Too Short

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "password": {
        "_errors": ["String must contain at least 8 character(s)"]
      }
    }
  }
}
```

---

## 🧪 Testing Examples

### cURL

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "birthDate": "15/08/1990",
    "password": "securepass123",
    "confirmPassword": "securepass123",
    "currency": "USD",
    "timeZone": "America/New_York",
    "locale": "en"
  }'
```

### JavaScript/TypeScript

```typescript
const response = await fetch('http://localhost:3000/api/v1/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'John Doe',
    email: 'john@example.com',
    birthDate: '15/08/1990',
    password: 'securepass123',
    confirmPassword: 'securepass123',
    currency: 'USD',
    timeZone: 'America/New_York',
    locale: 'en',
  }),
});

const { data } = await response.json();

// Cookies are set automatically!
// Also available in response: data.tokens.accessToken, data.tokens.refreshToken
```

### Angular Service

```typescript
import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/api/v1';

  async register(formData: {
    name: string;
    email: string;
    birthDate: string; // dd/mm/yyyy
    password: string;
    confirmPassword: string;
  }) {
    const response = await this.http
      .post<any>(`${this.apiUrl}/auth/register`, formData, {
        withCredentials: true, // Important! Enables cookies
      })
      .toPromise();

    return response.data;
  }
}
```

---

## 🔒 Security Features

- ✅ **Password Hashing**: bcrypt with 10 salt rounds
- ✅ **Password Validation**: Min 8 characters
- ✅ **Confirm Password**: Must match password field
- ✅ **Email Validation**: Must be valid email format
- ✅ **Date Validation**: Must be dd/mm/yyyy format
- ✅ **httpOnly Cookies**: JavaScript cannot access tokens
- ✅ **Secure Cookies**: HTTPS only in production
- ✅ **SameSite**: CSRF protection

---

## 📊 What Happens After Registration

1. Password is hashed with bcrypt
2. Birth date is parsed and stored as Date object
3. User is created in MongoDB
4. JWT access token generated (15 min)
5. JWT refresh token generated (7 days)
6. Refresh token stored in database
7. Both tokens set as httpOnly cookies
8. Tokens also returned in JSON response
9. User can immediately use the app (already logged in!)

---

## 🎯 Frontend Integration

```typescript
// Step 1: User fills registration form
const formData = {
  name: 'John Doe',
  email: 'john@example.com',
  birthDate: '15/08/1990', // from date picker (format as dd/mm/yyyy)
  password: 'securepass123',
  confirmPassword: 'securepass123',
};

// Step 2: Submit to backend
const response = await registerUser(formData);

// Step 3: Cookies are automatically set!
// No need to manually store tokens

// Step 4: Redirect to app
window.location.href = 'https://app.mereka.io';

// Step 5: app.mereka.io receives cookies automatically!
// Cookies work across all *.mereka.io domains
```

---

**Production ready with multi-domain cookie support!** 🚀
