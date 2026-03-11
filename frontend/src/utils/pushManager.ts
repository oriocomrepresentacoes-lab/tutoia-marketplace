import { fetchApi } from './api';

const VAPID_PUBLIC_KEY = 'BJYUSJBlJMoOLfPBFGWf7B877X-qeadHZjCHvIEzNGSSlVY7e-MZKZCro0wqbEl8P6ija870GbspH7H4EbZmah0';

export const setupNotifications = async () => {
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
        let registration = await navigator.serviceWorker.getRegistration();

        if (!registration) {
            console.log('[PushManager] No registration found, registering manually...');
            registration = await navigator.serviceWorker.register('/sw.js', { type: 'module' });
        }

        // Wait for service worker to be active
        if (registration.installing) {
            console.log('[PushManager] SW is installing...');
        }

        console.log('[PushManager] Current permission state:', Notification.permission);

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            console.log('[PushManager] No existing subscription, requesting permission...');

            // Note: In some browsers, this MUST be triggered by a user gesture.
            // But we'll try here as a first attempt.
            const permission = await Notification.requestPermission();
            console.log('[PushManager] Permission result:', permission);

            if (permission !== 'granted') {
                console.warn('[PushManager] Notification permission not granted.');
                return;
            }

            console.log('[PushManager] Creating new subscription...');
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('[PushManager] Subscription successful!');
        } else {
            console.log('[PushManager] Already subscribed.');
        }

        // Send to backend
        console.log('[PushManager] Syncing subscription with backend...');
        const subJSON = subscription.toJSON();
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
