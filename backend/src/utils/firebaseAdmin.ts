import * as admin from 'firebase-admin';
import * as path from 'path';

let serviceAccount: any;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        console.log('[FirebaseAdmin] Using service account from environment variable.');
    } catch (error) {
        console.error('[FirebaseAdmin] Failed to parse FIREBASE_SERVICE_ACCOUNT env var:', error);
    }
}

if (!serviceAccount) {
    try {
        const fs = require('fs');
        const filePath = path.join(process.cwd(), 'firebase-service-account.json');
        if (fs.existsSync(filePath)) {
            serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            console.log('[FirebaseAdmin] Using service account from local file.');
        } else {
            console.warn('[FirebaseAdmin] Local service account file NOT found at:', filePath);
        }
    } catch (error) {
        console.error('[FirebaseAdmin] Error reading local service account file:', error);
    }
}

if (!admin.apps.length && serviceAccount) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('[FirebaseAdmin] Firebase Admin initialized successfully.');
    } catch (error: any) {
        console.error('[FirebaseAdmin] Error initializing Firebase Admin:', error.message);
    }
} else if (!serviceAccount) {
    console.warn('[FirebaseAdmin] No service account provided. ENV exists?', !!process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
    console.log('[FirebaseAdmin] Firebase Admin already initialized or pending.');
}

// Function to get messaging, avoids immediate crash if not initialized
export const getMessaging = () => {
    if (!admin.apps.length) {
        console.warn('[FirebaseAdmin] Attempted to use Messaging but Firebase is not initialized.');
        return null;
    }
    return admin.messaging();
};

const messagingProxy = {
    sendEachForMulticast: async (message: any) => {
        if (!admin.apps.length) {
            console.error('[FirebaseAdmin] Cannot send notification: Firebase not initialized.');
            return { successCount: 0, failureCount: 0, responses: [] };
        }
        return admin.messaging().sendEachForMulticast(message);
    }
} as any;

export const messaging = messagingProxy as admin.messaging.Messaging;
