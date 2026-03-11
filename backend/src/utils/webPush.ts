import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BJYUSJBlJMoOLfPBFGWf7B877X-qeadHZjCHvIEzNGSSlVY7e-MZKZCro0wqbEl8P6ija870GbspH7H4EbZmah0';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'eLRM59UDbce3ur3QJvGDgI2Qz6QE4GxvSUJTzMvfdu0';

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
