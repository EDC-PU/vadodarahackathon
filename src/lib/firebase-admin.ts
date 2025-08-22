
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';


function initializeAdminApp(): admin.app.App | null {
    if (getApps().length > 0) {
        console.log("Firebase Admin SDK: Using existing app.");
        return admin.app();
    }

    console.log("Firebase Admin SDK: Initializing new app...");
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.error("Firebase Admin SDK: Missing required environment variables. Ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are set in your .env.local file for server-side operations.");
        return null;
    }

    try {
        const app = admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey,
            }),
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        });

        console.log("Firebase Admin SDK: New app initialized successfully.");
        return app;
    } catch (error) {
        console.error("Firebase Admin SDK: Initialization failed with error:", error);
        return null;
    }
}

// Export functions to get the services, ensuring initialization
export function getAdminApp() {
    return initializeAdminApp();
}

export function getAdminDb() {
    const app = getAdminApp();
    if (!app) {
        console.error("Firebase Admin SDK: Cannot get Firestore instance, app initialization failed.");
        return null;
    }
    console.log("Firebase Admin SDK: Getting Firestore instance.");
    return getFirestore(app);
}

export function getAdminAuth() {
    const app = getAdminApp();
    if (!app) {
        console.error("Firebase Admin SDK: Cannot get Auth instance, app initialization failed.");
        return null;
    }
    console.log("Firebase Admin SDK: Getting Auth instance.");
    return getAuth(app);
}

export function getAdminStorage() {
    const app = getAdminApp();
    if (!app) {
        console.error("Firebase Admin SDK: Cannot get Storage instance, app initialization failed.");
        return null;
    }
    console.log("Firebase Admin SDK: Getting Storage instance.");
    return getStorage(app);
}

export default admin;
