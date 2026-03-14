import { fetchApi } from './api';
import { messaging, VAPID_KEY } from './firebase';
import { getToken } from 'firebase/messaging';

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return 'unsupported';
    return await Notification.requestPermission();
};

export const setupNotifications = async (): Promise<void> => {
    console.log('[PushManager] Initializing FCM setup...');

    if (!('serviceWorker' in navigator)) {
        console.warn('[PushManager] Service Workers not supported');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('[PushManager] Permission not granted.');
            return;
        }

        const registration = await navigator.serviceWorker.ready;
        
        console.log('[PushManager] Fetching FCM Token...');
        const currentToken = await getToken(messaging, {
            serviceWorkerRegistration: registration,
            vapidKey: VAPID_KEY
        });

        if (currentToken) {
            console.log('[PushManager] FCM Token obtained:', currentToken);
            
            // Send to backend
            await fetchApi('/push/subscribe', {
                method: 'POST',
                body: JSON.stringify({
                    token: currentToken
                })
            });
            console.log('[PushManager] Token synced with server.');
        } else {
            console.warn('[PushManager] No registration token available. Request permission to generate one.');
        }

    } catch (error) {
        console.error('[PushManager] Error during FCM setup:', error);
    }
};

export const clearAllUserSubscriptions = async (): Promise<boolean> => {
    try {
        console.log('[PushManager] Clearing subscriptions on server...');
        await fetchApi('/push/clear-all', { method: 'DELETE' });
        console.log('[PushManager] Cloud state cleared.');
        return true;
    } catch (error) {
        console.error('[PushManager] Failed to clear subscriptions:', error);
        return false;
    }
};

export const forceResubscribe = async (): Promise<boolean> => {
    try {
        console.log('[PushManager] Re-initializing FCM...');
        await setupNotifications();
        return true;
    } catch (error) {
        console.error('[PushManager] Failed to force resubscribe:', error);
        return false;
    }
};
