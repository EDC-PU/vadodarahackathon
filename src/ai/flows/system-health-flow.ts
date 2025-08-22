
'use server';
/**
 * @fileOverview A flow to check the health and connectivity of Firebase services.
 */
import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import admin from 'firebase-admin';
import { getAdminApp, getAdminDb, getAdminAuth, getAdminStorage } from '@/lib/firebase-admin';

// Define schemas for the output
const ServiceStatusSchema = z.object({
  success: z.boolean(),
  message: z.string(),
});

const EnvVarDetailsSchema = z.object({
    key: z.string(),
    set: z.boolean(),
});

const EnvVarsStatusSchema = ServiceStatusSchema.extend({
  details: z.array(EnvVarDetailsSchema),
});

const FirestoreStatusSchema = ServiceStatusSchema.extend({
  canRead: z.boolean(),
  canWrite: z.boolean(),
});

const AuthStatusSchema = ServiceStatusSchema.extend({
  canListUsers: z.boolean(),
});

const StorageStatusSchema = ServiceStatusSchema.extend({
  bucketExists: z.boolean(),
  bucket: z.string().optional(),
});

const SystemHealthStateSchema = z.object({
  envVars: EnvVarsStatusSchema,
  serviceAccount: ServiceStatusSchema,
  firestore: FirestoreStatusSchema,
  auth: AuthStatusSchema,
  storage: StorageStatusSchema,
  timestamp: z.string(),
});

export type SystemHealthState = z.infer<typeof SystemHealthStateSchema>;

// Define the main function and flow
export async function runHealthCheck(): Promise<SystemHealthState> {
  return systemHealthCheckFlow();
}

const systemHealthCheckFlow = ai.defineFlow(
  {
    name: 'systemHealthCheckFlow',
    outputSchema: SystemHealthStateSchema,
  },
  async () => {
    const timestamp = new Date().toLocaleString();

    // 1. Check Environment Variables
    const envKeys = [
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
    ];
    const envVarDetails = envKeys.map(key => ({ key, set: !!process.env[key] }));
    const allEnvVarsSet = envVarDetails.every(v => v.set);
    const envVars = {
        success: allEnvVarsSet,
        message: allEnvVarsSet ? "All required Firebase environment variables are set." : "One or more required Firebase environment variables are missing.",
        details: envVarDetails
    };

    // 2. Check Service Account
    let serviceAccount: z.infer<typeof ServiceStatusSchema> = { success: false, message: "" };
    try {
        getAdminApp(); // This will throw if initialization fails
        serviceAccount = { success: true, message: "Firebase Admin SDK initialized successfully." };
    } catch (e: any) {
        serviceAccount = { success: false, message: `Firebase Admin SDK initialization failed: ${e.message}` };
    }
    
    // 3. Check Firestore
    let firestore: z.infer<typeof FirestoreStatusSchema> = { success: false, message: "Firestore check not performed.", canRead: false, canWrite: false };
    if (serviceAccount.success) {
        try {
            const db = getAdminDb();
            const testDocRef = db.collection('__healthchecks__').doc('test');
            // Write
            await testDocRef.set({ timestamp: admin.firestore.FieldValue.serverTimestamp() });
            firestore.canWrite = true;
            // Read
            const doc = await testDocRef.get();
            firestore.canRead = doc.exists;
            // Delete
            await testDocRef.delete();

            firestore.success = firestore.canRead && firestore.canWrite;
            firestore.message = firestore.success ? "Firestore connection successful - can read and write." : "Firestore check completed with partial success or failure.";
        } catch (e: any) {
            firestore.message = `Firestore check failed: ${e.message}`;
        }
    }

    // 4. Check Firebase Auth
    let auth: z.infer<typeof AuthStatusSchema> = { success: false, message: "Auth check not performed.", canListUsers: false };
     if (serviceAccount.success) {
        try {
            const authAdmin = getAdminAuth();
            await authAdmin.listUsers(1); // Check if we can list users
            auth.canListUsers = true;
            auth.success = true;
            auth.message = "Firebase Auth connection successful.";
        } catch (e: any) {
            auth.message = `Firebase Auth check failed: ${e.message}`;
        }
    }

    // 5. Check Firebase Storage
    let storage: z.infer<typeof StorageStatusSchema> = { success: false, message: "Storage check not performed.", bucketExists: false };
     if (serviceAccount.success) {
        try {
            const storageAdmin = getAdminStorage();
            const bucket = storageAdmin.bucket();
            const [exists] = await bucket.exists();
            storage.bucketExists = exists;
            storage.bucket = bucket.name;
            storage.success = exists;
            storage.message = exists ? "Firebase Storage connection successful." : "Default storage bucket not found.";
        } catch (e: any)_ {
            storage.message = `Firebase Storage check failed: ${e.message}`;
        }
    }

    return {
      envVars,
      serviceAccount,
      firestore,
      auth,
      storage,
      timestamp,
    };
  }
);

// This is needed for the dev menu
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
if (process.env.GENKIT_ENV === 'dev') {
  genkit({
    plugins: [googleAI()],
    flows: [systemHealthCheckFlow],
  });
}
