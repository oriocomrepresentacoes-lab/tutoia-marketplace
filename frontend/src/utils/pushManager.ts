import { fetchApi } from './api';

const VAPID_PUBLIC_KEY = 'BI1v8IS5TqrMM0Pwe-voEE_VWir4fNrxBQLSBElSOOwVRriXIR0Avantd5bIIIE7qFCxnpsAE7oPYJnDFbHsX_Q';

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return 'unsupported';
    return await Notification.requestPermission();
};

export const setupNotifications = async (): Promise<void> => {
    console.log('[PushManager] Initializing setup...');

    if (!('serviceWorker' in navigator)) {
        console.warn('[PushManager] Service Workers not supported');
        return;
    }
    if (!('PushManager' in window)) {
        console.warn('[PushManager] Push Manager not supported');
        return;
    }

    try {
        console.log('[PushManager] Checking registration...');
        console.log('[PushManager] Registering/Updating Service Worker with v=1.0.5...');
        let registration = await navigator.serviceWorker.register('/sw.js?v=1.0.5', { scope: '/' });

        await navigator.serviceWorker.ready;
        console.log('[PushManager] Service Worker is ready.');

        console.log('[PushManager] Current permission state:', Notification.permission);

        if (Notification.permission !== 'granted') {
            console.log('[PushManager] Permission not granted, skipping auto-subscribe.');
            return;
        }

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Check if VAPID key matches
            const currentKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
            const subKey = new Uint8Array(subscription.options.applicationServerKey as ArrayBuffer);

            let mismatch = currentKey.length !== subKey.length;
            if (!mismatch) {
                for (let i = 0; i < currentKey.length; i++) {
                    if (currentKey[i] !== subKey[i]) {
                        mismatch = true;
                        break;
                    }
                }
            }

            if (mismatch) {
                console.log('[PushManager] VAPID Key mismatch detected! Re-subscribing...');
                await subscription.unsubscribe();
                subscription = null;
            }
        }

        if (!subscription) {
            console.log('[PushManager] No valid subscription, creating one...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('[PushManager] Subscription successful!');
        } else {
            console.log('[PushManager] Valid subscription found.');
        }

        // Send to backend
        console.log('[PushManager] Syncing subscription with backend...');
        const subJSON = subscription.toJSON();

        // Ensure keys are present before sending
        if (!subJSON.keys || !subJSON.keys.p256dh || !subJSON.keys.auth) {
            console.error('[PushManager] Subscription missing keys, force re-subscribing...');
            await subscription.unsubscribe();
            return setupNotifications();
        }

        await fetchApi('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({
                endpoint: subJSON.endpoint,
                keys: subJSON.keys
            })
        });
        console.log('[PushManager] Setup complete and synced with server.');

    } catch (error) {
        console.error('[PushManager] Error during setup:', error);
    }
};

export const clearAllUserSubscriptions = async (): Promise<boolean> => {
    try {
        console.log('[PushManager] Clearing all subscriptions on server...');
        await fetchApi('/push/clear-all', { method: 'DELETE' });

        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }
        console.log('[PushManager] Cloud and local state cleared.');
        return true;
    } catch (error) {
        console.error('[PushManager] Failed to clear all subscriptions:', error);
        return false;
    }
};

export const forceResubscribe = async (): Promise<boolean> => {
    try {
        console.log('[PushManager] Forcefully clearing subscription...');
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
            const subscription = await registration.pushManager.getSubscription();
            if (subscription) {
                await subscription.unsubscribe();
            }
        }
        console.log('[PushManager] Old subscription cleared. Re-initializing...');
        await setupNotifications();
        return true;
    } catch (error) {
        console.error('[PushManager] Failed to force resubscribe:', error);
        return false;
    }
};

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
