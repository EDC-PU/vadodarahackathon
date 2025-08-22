
import admin from 'firebase-admin';
import { getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';


function initializeAdminApp() {
    if (getApps().length > 0) {
        console.log("Firebase Admin SDK: Using existing app.");
        return admin.app();
    }

    console.log("Firebase Admin SDK: Initializing new app...");
    const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

    if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
        console.error("Firebase Admin SDK: Missing required environment variables (NEXT_PUBLIC_FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).");
        throw new Error("Required Firebase Admin environment variables are not set.");
    }

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
}

// Export functions to get the services, ensuring initialization
export function getAdminApp() {
    return initializeAdminApp();
}

export function getAdminDb() {
    console.log("Firebase Admin SDK: Getting Firestore instance.");
    return getFirestore(getAdminApp());
}

export function getAdminAuth() {
    console.log("Firebase Admin SDK: Getting Auth instance.");
    return getAuth(getAdminApp());
}

export function getAdminStorage() {
    console.log("Firebase Admin SDK: Getting Storage instance.");
    return getStorage(getAdminApp());
}

export default admin;
