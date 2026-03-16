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
    
    // In background mode, if we have a notification object + a data object,
    // we use a tag-based showNotification to ensure icon/badge and deduplication.
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

    // If browser auto-showed a notification, this manual call with same tag will replace it.
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Manual Push Listener Fallback for maximum reliability in "Killed" state
self.addEventListener('push', (event) => {
    if (!event.data) return;
    
    try {
        const payload = event.data.json();
        console.log('[SW] Raw push received:', payload);
        
        // If it's a standard FCM payload with notification object, 
        // the browser might handle it, but we force show it with our tag
        // if we detect that onBackgroundMessage might not have fired.
        const data = payload.data || {};
        const notification = payload.notification || {};
        
        if (notification.title || data.title) {
            const title = notification.title || data.title || '🔔 TutShop';
            const tagBase = data.type === 'chat_message' ? 'chat' : (data.type === 'new_ad' ? 'ad' : 'banner');
            const uniqueId = data.id || (data.url ? data.url.split('/').pop() : 'global');

            event.waitUntil(
                self.registration.showNotification(title, {
                    body: notification.body || data.body || '',
                    icon: '/app-icon-v3.png',
                    badge: '/app-icon-v3.png',
                    tag: `${tagBase}_${uniqueId}`,
                    data: { url: data.url || '/dashboard' },
                    renotify: true
                })
            );
        }
    } catch (e) {
        console.error('[SW] Error parsing push data:', e);
    }
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
