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
    
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Deduplication Guard: On Android/Windows, the browser handles 'notification' blocks automatically.
    // However, on iOS Safari PWA, it DOES NOT show them automatically.
    if (payload.notification && !isIOS) {
        console.log('[SW] Automatic notification detected (non-iOS), skipping manual display.');
        return;
    }
    
    const data = payload.data || {};
    const notification = payload.notification || {};

    const notificationTitle = notification.title || data.title || '🔔 TutShop';
    const tagBase = data.type === 'chat_message' ? 'chat' : (data.type === 'new_ad' ? 'ad' : 'banner');
    const uniqueId = data.id || (data.url ? data.url.split('/').pop() : 'global');

    const notificationOptions = {
        body: notification.body || data.body || '',
        icon: self.location.origin + '/app-icon-v3.png',
        badge: self.location.origin + '/app-icon-v3.png',
        tag: `${tagBase}_${uniqueId}`,
        data: { url: data.url || '/dashboard' },
        renotify: true
    };

    // Use event.waitUntil inside the handler if possible, but Firebase SDK doesn't always 
    // provide the event object here. We'll rely on the native listener for iOS-specific waiting.
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Native Push Event Fallback: Crucial for iOS Safari PWA Background Notifications
self.addEventListener('push', (event) => {
    console.log('[SW] PUSH event received (Native):', event);
    
    // If the browser already has a notification displayed for this push, 
    // it usually won't trigger if it was handled automatically.
    // But on iOS PWA, we usually need to handle it manually.
    
    let payload;
    try {
        payload = event.data ? event.data.json() : null;
        console.log('[SW] PUSH data (Native):', payload);
    } catch (e) {
        console.warn('[SW] PUSH error parsing data:', e);
        return;
    }

    if (!payload) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    // Only process native push for iOS background users, to avoid duplicates on Android
    if (isIOS) {
        const data = payload.data || {};
        const notification = payload.notification || {};
        
        const title = notification.title || data.title || '🔔 TutShop';
        const options = {
            body: notification.body || data.body || '',
            icon: self.location.origin + '/app-icon-v3.png',
            badge: self.location.origin + '/app-icon-v3.png',
            tag: data.tag || (data.url ? data.url.split('/').pop() : 'push_ios'),
            data: { url: data.url || '/dashboard' },
            renotify: true
        };

        event.waitUntil(self.registration.showNotification(title, options));
        console.log('[SW] PUSH notification shown on iOS:', title);
    }
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
