# 🔐 How to Add Firebase Credentials (Do It Yourself - Secure)

## ✅ **You Should NOT Share Credentials!**

**Correct approach**: Add Firebase credentials to your `.env` file yourself.

---

## 📋 **Step-by-Step Guide**

### **Step 1: Get Firebase Service Account** (5 minutes)

1. **Go to Firebase Console**:

   ```
   https://console.firebase.google.com/
   ```

2. **Select your project** (probably `mereka-a4ae2`)

3. **Navigate to Service Accounts**:
   - Click gear icon (⚙️) → **Project settings**
   - Click **Service accounts** tab
   - Click **"Generate new private key"** button
   - Click **"Generate key"** in confirmation dialog
   - JSON file will download

---

### **Step 2: Open the Downloaded JSON File**

The file will be named something like: `mereka-a4ae2-firebase-adminsdk-xxxxx-abc123.json`

It contains:

```json
{
  "type": "service_account",
  "project_id": "mereka-a4ae2",
  "private_key_id": "abc123def456...",
  "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com",
  "client_id": "123456789012345678901",
  ...
}
```

---

### **Step 3: Add to Your `.env` File**

**Open your `.env` file**:

```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-backend-v2-elevate-ref
nano .env
# or
code .env
```

**Add these lines** (replace with values from your JSON):

```env
# Firebase Admin SDK (from service account JSON)
FIREBASE_PROJECT_ID=mereka-a4ae2
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

**⚠️ IMPORTANT**:

- Keep the quotes around `FIREBASE_PRIVATE_KEY`
- Keep the `\n` characters (they represent newlines)
- Copy the ENTIRE private key including `-----BEGIN` and `-----END`

---

### **Step 4: Restart Your Server**

```bash
# Stop current server (Ctrl+C or kill process)

# Restart
npm run dev
```

**You should see**:

```
✅ Firebase Admin SDK initialized
🎉 Server is running on http://0.0.0.0:3000
```

If you see this, Firebase is configured! ✅

---

## 🧪 **Test Firebase Connection**

### **Check Server Logs**

When server starts, you should see:

```
✅ Firebase Admin SDK initialized
```

If you see:

```
⚠️  Firebase Admin SDK not configured
```

Then check your `.env` file - the variables might not be loaded.

---

### **Test Auth Endpoint** (Without Frontend)

**Without actual Firebase token**, auth will fail (expected):

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"firebaseToken":"fake-token"}'

# Response: "Invalid Firebase token" (this means Firebase SDK is working!)
```

---

## 📝 **Complete `.env` Example**

```env
# Application
NODE_ENV=development
PORT=3000
HOST=0.0.0.0

# MongoDB
MONGODB_URI=mongodb+srv://0iamhira_db_user:NSkjmF6M0DDWXY9U@cluster0.ruoop0h.mongodb.net/?appName=Cluster0
MONGODB_TEST_URI=mongodb+srv://0iamhira_db_user:NSkjmF6M0DDWXY9U@cluster0.ruoop0h.mongodb.net/mereka_test?appName=Cluster0

# JWT Authentication
JWT_SECRET=mereka-backend-super-secret-jwt-key-for-development-only-change-in-production
JWT_ACCESS_TOKEN_EXPIRES=15m
JWT_REFRESH_TOKEN_EXPIRES=7d
JWT_REFRESH_SECRET=mereka-refresh-token-secret-different-from-access-change-in-production

# Firebase Admin SDK (ADD THESE - from your service account JSON)
FIREBASE_PROJECT_ID=mereka-a4ae2
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"

# Logging
LOG_LEVEL=info
LOG_FILE=./logs/app.log

# CORS
CORS_ORIGIN=*

# Domains (for production)
ALLOWED_ORIGINS=https://mereka.io,https://app.mereka.io,https://auth.mereka.io
AUTH_DOMAIN=auth.mereka.io
APP_DOMAIN=app.mereka.io

# API
API_PREFIX=/api/v1

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100
```

---

## ✅ **Security Best Practices**

### **DO**:

✅ Add credentials to `.env` yourself
✅ Keep `.env` in `.gitignore` (already done)
✅ Use different secrets for dev/production
✅ Rotate credentials regularly
✅ Use environment variables in production (not `.env` file)

### **DON'T**:

❌ Share credentials with anyone
❌ Commit `.env` to git
❌ Use production credentials in development
❌ Hardcode credentials in code

---

## 🎯 **After Adding Credentials**

Once you add Firebase credentials and restart:

### **You Can**:

1. ✅ Test login with Firebase tokens
2. ✅ Sync Firebase users to MongoDB
3. ✅ Generate custom JWTs
4. ✅ Test protected endpoints
5. ✅ Build complete auth flow

### **Frontend Can**:

1. Login with Firebase (Email/Google)
2. Send Firebase token to `/api/v1/auth/login`
3. Get custom JWT tokens
4. Use JWT for API requests
5. Refresh tokens when expired

---

## 💡 **I Don't Need Your Credentials!**

**You can**:

- Add them to `.env` yourself
- Test authentication yourself
- Keep credentials secure

**I've built**:

- ✅ Complete authentication system
- ✅ All documentation
- ✅ Testing guides
- ✅ Everything you need

**Just add credentials and it works!** 🔥

---

**See**: `FIREBASE-SETUP.md` for detailed Firebase Console instructions

**Current status**: Auth system complete, waiting for Firebase credentials (that YOU add)! ✅
