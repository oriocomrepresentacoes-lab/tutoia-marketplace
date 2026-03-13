import webpush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

const publicVapidKey = process.env.VAPID_PUBLIC_KEY || 'BC07gcyNK4qVclHvh940Lxaw5kCIcnQIUYAvzdhQlOFFQ4iIMH1eDCyLrjo0p2JCizs9e93_H8rC8Qit-U4qjI8';
const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'jp_nQyFDQuXTLY1t_F1LFEiuWIzL1Xat_u99mC_D7u0';

webpush.setVapidDetails(
    'mailto:suporte@tutshop.com.br',
    publicVapidKey,
    privateVapidKey
);

export const sendPushNotification = async (subscription: any, payload: any) => {
    try {
        const response = await webpush.sendNotification(subscription, JSON.stringify(payload));
        console.log(`[WebPush] ✅ Delivery accepted! Status: ${response.statusCode}. Endpoint: ${subscription.endpoint.substring(0, 30)}...`);
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
