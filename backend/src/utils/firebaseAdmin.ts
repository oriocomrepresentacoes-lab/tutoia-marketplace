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
        serviceAccount = require(path.join(process.cwd(), 'firebase-service-account.json'));
        console.log('[FirebaseAdmin] Using service account from local file.');
    } catch (error) {
        console.warn('[FirebaseAdmin] Local service account file not found.');
    }
}

if (!admin.apps.length && serviceAccount) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('[FirebaseAdmin] Firebase Admin initialized.');
} else if (!serviceAccount) {
    console.error('[FirebaseAdmin] No service account provided. Firebase features will not work.');
}

export const messaging = admin.messaging();
