import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BFPGPsZZlw1Q9h_igMtlJ66j22Oq8e_Ux59Og3NkS331TLTFGr_z_vYyViVzya9Vdfe_YLU_sjxr0-FUmADAcFM';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'z3j2jXYhZWWyGqrwmvB_8tlsE-UP45m4OILLr1O4qWo';

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
