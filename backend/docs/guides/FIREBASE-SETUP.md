# 🔥 Firebase Setup Guide

## What You Need from Firebase

To enable authentication, you need Firebase Admin SDK credentials.

---

## 📋 **Firebase Service Account Credentials**

### **Option 1: Get from Firebase Console** (Recommended)

1. **Go to Firebase Console**:
   - Visit: https://console.firebase.google.com/
   - Select your project: `mereka-a4ae2` (or your project)

2. **Navigate to Service Accounts**:
   - Click the gear icon (⚙️) → Project settings
   - Click "Service accounts" tab
   - Click "Generate new private key"
   - Download JSON file

3. **Extract Values from JSON**:

   ```json
   {
     "project_id": "mereka-a4ae2",
     "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
     "client_email": "firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com"
   }
   ```

4. **Add to `.env`**:

   ```env
   FIREBASE_PROJECT_ID=mereka-a4ae2
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhki...\n-----END PRIVATE KEY-----\n"
   ```

   **Important**: Keep the quotes and `\n` in the private key!

---

### **Option 2: Use Existing Service Account**

If you already have service account JSON:

```bash
# Copy the JSON values to .env
FIREBASE_PROJECT_ID="<from json>"
FIREBASE_CLIENT_EMAIL="<from json>"
FIREBASE_PRIVATE_KEY="<from json - keep \n characters>"
```

---

## 🚀 **Quick Setup**

### **1. Download Service Account JSON**

From Firebase Console → Project Settings → Service Accounts → Generate new private key

### **2. Add to .env**

```bash
cd /Users/hiramaniupadhyay/Documents/projects/Mereka/mereka-backend-v2-elevate-ref

# Add these lines to .env (replace with your values):
echo 'FIREBASE_PROJECT_ID=mereka-a4ae2' >> .env
echo 'FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com' >> .env
echo 'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"' >> .env
```

### **3. Test Firebase Connection**

```bash
npm run dev

# Should see:
# ✅ Firebase Admin SDK initialized
```

---

## 🧪 **Testing Authentication**

### **Without Firebase (Current State)**:

Server will start but auth endpoints will show:

```
⚠️  Firebase Admin SDK not configured - authentication will not work
```

You can still:

- ✅ Test User API endpoints
- ✅ Create users manually
- ✅ Test all CRUD operations

### **With Firebase Credentials**:

Full authentication flow works:

- ✅ Login with Firebase token
- ✅ Get custom JWT
- ✅ Refresh tokens
- ✅ Protected endpoints

---

## 📝 **What I Need from You**

Please provide:

1. **Firebase Project ID** (example: `mereka-a4ae2`)
2. **Service Account Email** (example: `firebase-adminsdk-xxxxx@mereka-a4ae2.iam.gserviceaccount.com`)
3. **Private Key** (long string starting with `-----BEGIN PRIVATE KEY-----`)

**OR**

Just send me the service account JSON file content (I'll extract the values).

---

## ✅ **Current Status**

**Without Firebase credentials**:

- ✅ User API: Fully working
- ✅ MongoDB: Connected
- ✅ Server: Running
- ⚠️ Auth API: Needs Firebase credentials

**With Firebase credentials** (once you provide them):

- ✅ Everything works!
- ✅ Full authentication flow
- ✅ Firebase → MongoDB sync
- ✅ Custom JWT generation

---

## 🎯 **Testing Now (Without Firebase)**

You can test all User endpoints:

```bash
# Test health
curl http://localhost:3000/health

# Test user creation
curl -X POST http://localhost:3000/api/v1/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@mereka.com","name":"Test User"}'

# Test user list
curl http://localhost:3000/api/v1/users

# See all endpoints
open http://localhost:3000/docs
```

**Auth endpoints exist but need Firebase to work!**

---

**Ready when you provide Firebase credentials!** 🔥
