import admin from 'firebase-admin';

let firebaseInitialized = false;
let messagingInstance: admin.messaging.Messaging | null = null;

// Check if Firebase credentials are available
const hasFirebaseCredentials = (): boolean => {
  return !!(
    process.env.FIREBASE_PRIVATE_KEY &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PROJECT_ID
  );
};

// Initialize Firebase Admin SDK only if credentials are available
const initializeFirebase = (): void => {
  if (firebaseInitialized) return;

  if (!hasFirebaseCredentials()) {
    console.warn('⚠️  Firebase credentials not found. Push notifications will be disabled.');
    return;
  }

  try {
    const serviceAccount = {
      type: "service_account",
      project_id: process.env.FIREBASE_PROJECT_ID || "t-yap-dev",
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
      auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL,
      universe_domain: "googleapis.com"
    };

    // Check if app already initialized (e.g., in tests)
    if (admin.apps.length === 0) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
      });
    }

    messagingInstance = admin.messaging();
    firebaseInitialized = true;
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error);
    console.warn('⚠️  Push notifications will be disabled.');
  }
};

// Initialize on module load
initializeFirebase();

// Export messaging with lazy initialization check
export const messaging = (): admin.messaging.Messaging => {
  if (!messagingInstance) {
    throw new Error('Firebase is not initialized. Please configure FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID environment variables.');
  }
  return messagingInstance;
};

// Export admin instance
export default admin;