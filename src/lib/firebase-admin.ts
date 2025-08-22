
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors
if (!admin.apps.length) {
  try {
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      throw new Error("NEXT_PUBLIC_FIREBASE_PROJECT_ID is not set in the environment variables.");
    }
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error("FIREBASE_CLIENT_EMAIL is not set in the environment variables.");
    }
    if (!privateKey) {
        throw new Error("FIREBASE_PRIVATE_KEY is not set in the environment variables.");
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error);
  }
}

const adminDb = admin.firestore();

export { adminDb };
export default admin;
