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
        return { success: true, shouldRemove: false };
    } catch (error: any) {
        console.error('Error sending push notification:', error.statusCode, error.endpoint);

        // 410 (Gone) or 404 (Not Found) means the subscription is definitively invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
            return { success: false, shouldRemove: true, error: 'Inscrição expirada ou inválida' };
        }

        // Other errors (like 401 Unauthorized) mean keys are wrong
        return { success: false, shouldRemove: false, error: `Erro ${error.statusCode}: ${error.message || 'Falha na entrega'}` };
    }
};

export default webpush;
