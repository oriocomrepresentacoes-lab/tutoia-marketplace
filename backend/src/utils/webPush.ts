import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BI1v8IS5TqrMM0Pwe-voEE_VWir4fNrxBQLSBElSOOwVRriXIR0Avantd5bIIIE7qFCxnpsAE7oPYJnDFbHsX_Q';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'wZFZx5bDKKv86TVIhqdZWHxysBDxVWmoQXGJ6YRMASk';

webpush.setVapidDetails(
    'mailto:suporte@tutshop.com.br',
    publicVapidKey,
    privateVapidKey
);

export const sendPushNotification = async (subscription: any, payload: any) => {
    try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
    } catch (error: any) {
        console.error('Error sending push notification:', error.statusCode, error.endpoint);
        // If the subscription is no longer valid, we should theoretically remove it from DB
        if (error.statusCode === 410 || error.statusCode === 404) {
            return { shouldRemove: true };
        }
    }
    return { shouldRemove: false };
};

export default webpush;
