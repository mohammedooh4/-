// Firebase Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyDNIA9TwvTEgXNSUVP305xWTVu4Aqrp0ek",
    authDomain: "market-management-6129d.firebaseapp.com",
    projectId: "market-management-6129d",
    storageBucket: "market-management-6129d.firebasestorage.app",
    messagingSenderId: "318547026343",
    appId: "1:318547026343:web:fc34f297cf750e852e1682",
    measurementId: "G-SBGCMS9KT5"
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);

    const notificationTitle = payload.notification?.title || 'إشعار جديد';
    const notificationOptions = {
        body: payload.notification?.body || '',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: payload.data,
        dir: 'rtl',
        tag: payload.data?.type || 'general',
        renotify: true,
        silent: true,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click:', event);
    event.notification.close();

    const data = event.notification.data;
    let url = '/';

    if (data?.type === 'order_status_update' && data?.order_id) {
        url = '/cart';
    } else if (data?.type === 'new_product' && data?.product_id) {
        url = `/products/${data.product_id}`;
    } else if (data?.type === 'new_order') {
        url = '/admin/orders';
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window is already open, focus it
            for (const client of clientList) {
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Otherwise open a new window
            if (clients.openWindow) {
                return clients.openWindow(url);
            }
        })
    );
});
