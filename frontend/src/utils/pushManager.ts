import { fetchApi } from './api';

const VAPID_PUBLIC_KEY = 'BJYUSJBlJMoOLfPBFGWf7B877X-qeadHZjCHvIEzNGSSlVY7e-MZKZCro0wqbEl8P6ija870GbspH7H4EbZmah0';

export const setupNotifications = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported');
        return;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check if already subscribed
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // Request permission
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.log('Notification permission denied');
                return;
            }

            // Subscribe
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });
            console.log('New subscription created');
        }

        // Send to backend
        const subJSON = subscription.toJSON();
        await fetchApi('/push/subscribe', {
            method: 'POST',
            body: JSON.stringify({
                endpoint: subJSON.endpoint,
                keys: subJSON.keys
            })
        });

    } catch (error) {
        console.error('Push setup error:', error);
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
