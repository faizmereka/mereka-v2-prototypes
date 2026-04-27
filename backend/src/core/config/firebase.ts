import admin from 'firebase-admin';

let firebaseInitialized = false;

/**
 * Initialize Firebase Admin SDK
 */
export function initializeFirebase(): void {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Check if Firebase credentials are provided
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.warn('⚠️  Firebase Admin SDK not configured - authentication will not work');
      console.warn('   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY');
      return;
    }

    // Initialize Firebase Admin
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });

    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized');
  } catch (_error) {
    console.error('❌ Firebase Admin SDK initialization failed:', _error);
    throw _error;
  }
}

/**
 * Get Firebase Admin Auth instance
 */
export function getFirebaseAuth() {
  if (!firebaseInitialized) {
    initializeFirebase();
  }
  return admin.auth();
}

/**
 * Verify Firebase ID token
 */
export async function verifyFirebaseToken(token: string) {
  try {
    const auth = getFirebaseAuth();
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken;
  } catch {
    throw new Error('Invalid Firebase token');
  }
}

export { admin };
