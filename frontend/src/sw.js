/* SW Version: 2.4.0 - Notification Deduplication */
import { precacheAndRoute } from 'workbox-precaching';
import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

// Precache assets
precacheAndRoute(self.__WB_MANIFEST);

// Initialize Firebase in SW
const firebaseConfig = {
  apiKey: "AIzaSyBfB6QYnvfuVyFWbw4NiwC6uF8aITDAS7U",
  authDomain: "tutshop-marketplace.firebaseapp.com",
  projectId: "tutshop-marketplace",
  storageBucket: "tutshop-marketplace.firebasestorage.app",
  messagingSenderId: "538795891753",
  appId: "1:538795891753:web:543e41b0fb80139a695038"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
    console.log('[SW] Background message received:', payload);
    
    // Deduplication Guard: If payload already has a notification object, 
    // the browser handles it automatically via FCM. 
    // We only show manual notification for "data-only" payloads.
    if (payload.notification) {
        console.log('[SW] Automatic notification detected, skipping manual display.');
        return;
    }
    
    const data = payload.data || {};
    const notification = payload.notification || {};

    const notificationTitle = notification.title || data.title || '🔔 TutShop';
    const tagBase = data.type === 'chat_message' ? 'chat' : (data.type === 'new_ad' ? 'ad' : 'banner');
    const uniqueId = data.id || (data.url ? data.url.split('/').pop() : 'global');

    const notificationOptions = {
        body: notification.body || data.body || '',
        icon: '/app-icon-v3.png',
        badge: '/app-icon-v3.png',
        tag: `${tagBase}_${uniqueId}`,
        data: { url: data.url || '/dashboard' },
        renotify: true
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});
