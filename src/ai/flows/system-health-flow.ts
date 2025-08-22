
'use server';
/**
 * @fileOverview A flow to check the health and connectivity of Firebase services.
 */
import { ai } from '@/ai/genkit';
import admin from 'firebase-admin';
import { getAdminApp, getAdminDb, getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';
import { SystemHealthState, SystemHealthStateSchema } from '@/lib/types';
import {z} from 'genkit';

// Define the main function and flow
export async function runHealthCheck(): Promise<SystemHealthState> {
  console.log("Executing runHealthCheck function...");
  return systemHealthCheckFlow();
}

const systemHealthCheckFlow = ai.defineFlow(
  {
    name: 'systemHealthCheckFlow',
    outputSchema: SystemHealthStateSchema,
  },
  async () => {
    const timestamp = new Date().toLocaleString();
    console.log(`systemHealthCheckFlow started at ${timestamp}`);

    // 1. Check Environment Variables
    console.log("Checking environment variables...");
    const envKeys = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    ];
    const envVarDetails = envKeys.map(key => ({ key, set: !!process.env[key] }));
    const allEnvVarsSet = envVarDetails.every(v => v.set);
    const envVars: z.infer<typeof SystemHealthStateSchema.shape.envVars> = {
        success: allEnvVarsSet,
        message: allEnvVarsSet ? "All required Firebase environment variables are set." : "One or more required Firebase environment variables are missing.",
        details: envVarDetails
    };
    console.log("Environment variables check completed.", envVars);

    // 2. Check Service Account
    console.log("Checking Firebase Admin SDK initialization (Service Account)...");
    let serviceAccount: z.infer<typeof SystemHealthStateSchema.shape.serviceAccount> = { success: false, message: "" };
    try {
        getAdminApp(); // This will throw if initialization fails
        serviceAccount = { success: true, message: "Firebase Admin SDK initialized successfully." };
    } catch (e: any) {
        serviceAccount = { success: false, message: `Firebase Admin SDK initialization failed: ${e.message}` };
    }
    console.log("Service Account check completed.", serviceAccount);
    
    // 3. Check Firestore
    console.log("Checking Firestore connectivity...");
    let firestore: z.infer<typeof SystemHealthStateSchema.shape.firestore> = { success: false, message: "Firestore check not performed.", canRead: false, canWrite: false };
    if (serviceAccount.success) {
        try {
            const db = getAdminDb();
            const testDocRef = db.collection('__healthchecks__').doc('test');
            // Write
            console.log("Firestore: Attempting to write...");
            await testDocRef.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
            firestore.canWrite = true;
            console.log("Firestore: Write successful.");
            // Read
            console.log("Firestore: Attempting to read...");
            const doc = await testDocRef.get();
            firestore.canRead = doc.exists;
            console.log("Firestore: Read successful.");
            // Delete
            console.log("Firestore: Attempting to delete...");
            await testDocRef.delete();
            console.log("Firestore: Delete successful.");

            firestore.success = firestore.canRead && firestore.canWrite;
            firestore.message = firestore.success ? "Firestore connection successful - can read and write." : "Firestore check completed with partial success or failure.";
        } catch (e: any) {
            firestore.message = `Firestore check failed: ${e.message}`;
            console.error("Firestore check failed:", e);
        }
    } else {
        console.warn("Skipping Firestore check because service account initialization failed.");
    }
    console.log("Firestore check completed.", firestore);

    // 4. Check Firebase Auth
    console.log("Checking Firebase Auth connectivity...");
    let auth: z.infer<typeof SystemHealthStateSchema.shape.auth> = { success: false, message: "Auth check not performed.", canListUsers: false };
     if (serviceAccount.success) {
        try {
            const authAdmin = getAdminAuth();
            console.log("Auth: Attempting to list users...");
            await authAdmin.listUsers(1); // Check if we can list users
            auth.canListUsers = true;
            auth.success = true;
            auth.message = "Firebase Auth connection successful.";
            console.log("Auth: List users successful.");
        } catch (e: any) {
            auth.message = `Firebase Auth check failed: ${e.message}`;
            console.error("Firebase Auth check failed:", e);
        }
    } else {
        console.warn("Skipping Auth check because service account initialization failed.");
    }
    console.log("Auth check completed.", auth);

    // 5. Check Firebase Storage
    console.log("Checking Firebase Storage connectivity...");
    let storage: z.infer<typeof SystemHealthStateSchema.shape.storage> = { success: false, message: "Storage check not performed.", bucketExists: false };
     if (serviceAccount.success) {
        try {
            const storageAdmin = getAdminStorage();
            const bucket = storageAdmin.bucket();
            console.log(`Storage: Checking for bucket existence: ${bucket.name}`);
            const [exists] = await bucket.exists();
            storage.bucketExists = exists;
            storage.bucket = bucket.name;
            storage.success = exists;
            storage.message = exists ? "Firebase Storage connection successful." : "Default storage bucket not found.";
            console.log(`Storage: Bucket exists: ${exists}.`);
        } catch (e: any) {
            storage.message = `Firebase Storage check failed: ${e.message}`;
            console.error("Firebase Storage check failed:", e);
        }
    } else {
        console.warn("Skipping Storage check because service account initialization failed.");
    }
    console.log("Storage check completed.", storage);

    const finalState = {
      envVars,
      serviceAccount,
      firestore,
      auth,
      storage,
      timestamp,
    };

    console.log("systemHealthCheckFlow finished.", finalState);
    return finalState;
  }
);
