/* SW Version: 2.1.0 - FCM Integrated */
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
    const notificationTitle = payload.notification.title || '🔔 TutShop';
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/app-icon-v3.png',
        badge: '/app-icon-v3.png',
        data: payload.data || { url: '/dashboard' }
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/dashboard';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
