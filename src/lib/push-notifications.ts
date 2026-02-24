"use client";

import { Capacitor } from '@capacitor/core';
import { supabaseClient } from './supabase';

// Check if we're running on a native Capacitor platform
function isNativePlatform(): boolean {
    if (typeof window === 'undefined') return false;
    try {
        return Capacitor.isNativePlatform();
    } catch {
        return false;
    }
}

// Guard to prevent double web push initialization
let webPushInitialized = false;

/**
 * Initialize push notifications on native platforms.
 * Call this after user login.
 */
export async function initPushNotifications(userId: string) {

    console.log('Push notifications: initPushNotifications called for user:', userId);
    console.log('Push notifications: Platform:', Capacitor.getPlatform(), 'isNative:', isNativePlatform());

    if (isNativePlatform()) {
        // Native platform (Android/iOS) - use Capacitor
        await initNativePushNotifications(userId);
    } else {
        // Web platform - use Firebase Cloud Messaging
        await initWebPushNotifications(userId);
    }
}

/**
 * Initialize push notifications on native Capacitor platforms (Android/iOS)
 */
async function initNativePushNotifications(userId: string) {
    try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        // Remove any existing listeners first to avoid duplicates
        await PushNotifications.removeAllListeners();

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        console.log('Push notifications: Permission result:', permResult.receive);

        if (permResult.receive !== 'granted') {
            console.warn('Push notification permission not granted');
            return;
        }

        // Create notification channel (Android only)
        if (Capacitor.getPlatform() === 'android') {
            await PushNotifications.createChannel({
                id: 'orders_channel',
                name: 'تحديثات الطلبات',
                description: 'إشعارات عن حالة طلبك والطلبات الجديدة',
                importance: 5, // High importance
                visibility: 1, // Public visibility
                sound: 'default',
                vibration: true,
                lights: true,
                lightColor: '#598cfa',
            });

            // Create the custom sound channel specifically for order status updates
            await PushNotifications.createChannel({
                id: 'orders_sound_channel',
                name: 'تحديثات الطلبات بصوت مميز',
                description: 'إشعارات مخصصة للطلبات بصوت تفاعلي',
                importance: 5,
                visibility: 1,
                sound: 'mixkit_software_interface_start_2574',
                vibration: true,
                lights: true,
            });

            // Create additional channels for different notification types
            await PushNotifications.createChannel({
                id: 'general_channel',
                name: 'إشعارات عامة',
                description: 'إشعارات عامة من التطبيق',
                importance: 4,
                visibility: 1,
                sound: 'default',
                vibration: true,
            });
        }

        // IMPORTANT: Set up listeners BEFORE calling register()
        // to avoid missing the registration event
        PushNotifications.addListener('registration', async (token) => {
            console.log('Push Notifications: Registration successful, FCM Token:', token.value);
            await saveTokenToSupabase(userId, token.value);
        });

        PushNotifications.addListener('registrationError', (error) => {
            console.error('Push registration error:', error);
        });

        // Listen for incoming notifications (foreground)
        // Note: capacitor.config.ts is now configured with presentationOptions
        // so the OS will also show a standard system notification.
        PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push notification received (foreground):', notification);

            // Always show in-app banner for better UX when app is in foreground
            // Determine notification type
            const notifType = notification.data?.type === 'new_product' ? 'product'
                : notification.data?.type === 'order_status_update' ? 'order'
                    : 'general';

            // Show in-app banner for premium feel
            showInAppNotification(notification.title || '', notification.body || '', notifType);
        });

        // Listen for when app is in background and notification is tapped
        PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Push notification action performed (background/foreground):', action);
            const data = action.notification.data;

            // Navigate based on notification type
            if (data?.type === 'order_status_update' && data?.order_id) {
                // Navigate to cart/orders page
                window.location.href = '/cart';
            } else if (data?.type === 'new_product' && data?.product_id) {
                window.location.href = `/products/${data.product_id}`;
            } else if (data?.type === 'product_availability' && data?.product_id) {
                window.location.href = `/products/${data.product_id}`;
            }
        });

        // NOW register - the listeners are already in place to catch the token
        console.log('Push notifications: Calling register()...');
        await PushNotifications.register();
        console.log('Push notifications: register() completed');

    } catch (error) {
        console.error('Failed to initialize push notifications:', error);
    }
}

/**
 * Initialize push notifications on Web using Firebase Cloud Messaging
 */
async function initWebPushNotifications(userId: string) {
    if (typeof window === 'undefined') return;

    // Prevent duplicate initialization
    if (webPushInitialized) {
        console.log('Web Push: Already initialized, skipping duplicate init');
        return;
    }
    webPushInitialized = true;

    try {
        console.log('Web Push: Initializing Firebase Cloud Messaging...');

        // Check if Notification API is available
        if (!('Notification' in window)) {
            console.warn('Web Push: Notifications not supported in this browser');
            return;
        }

        // Check if service workers are supported
        if (!('serviceWorker' in navigator)) {
            console.warn('Web Push: Service workers not supported');
            return;
        }

        // Request notification permission first
        const permission = await Notification.requestPermission();
        console.log('Web Push: Notification permission:', permission);

        if (permission !== 'granted') {
            console.warn('Web Push: Notification permission not granted');
            return;
        }

        // Register the Firebase messaging service worker
        let swRegistration: ServiceWorkerRegistration | null = null;
        try {
            swRegistration = await registerFirebaseServiceWorker();
        } catch (swError) {
            console.warn('Web Push: Service worker registration failed:', swError);
            return;
        }

        if (!swRegistration) {
            console.warn('Web Push: Service worker registration returned null');
            return;
        }

        // Dynamic import to avoid SSR issues
        console.log('Web Push: Importing Firebase modules...');
        const { getFirebaseMessaging, getToken, onMessage } = await import('./firebase-config');
        console.log('Web Push: Firebase modules imported successfully');

        console.log('Web Push: Getting Firebase Messaging instance...');
        let messaging: any;
        try {
            const msgPromise = getFirebaseMessaging();
            const msgTimeout = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('getFirebaseMessaging timed out after 10s')), 10000)
            );
            messaging = await Promise.race([msgPromise, msgTimeout]);
        } catch (msgError: any) {
            console.error('Web Push: getFirebaseMessaging failed:', msgError?.message);
            return;
        }

        if (!messaging) {
            console.warn('Web Push: Firebase Messaging not supported');
            return;
        }
        console.log('Web Push: Firebase Messaging instance obtained');

        // Get FCM token - wrapped in its own try-catch with timeout
        // because push service may not be available (e.g. no VAPID key, localhost)
        let token: string | null = null;
        try {
            console.log('Web Push: Requesting FCM token with VAPID key...');
            console.log('Web Push: Service worker state:', swRegistration.active?.state);

            // Add timeout to prevent infinite hang (Increased timeout for dev environments)
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || 'BGPSYx7UH0pYQJmhyx4tXLyBT3Lx5KE-5ErPQtd0ApyzDNPNqwACt54D8EchChLBMoNrJl_Z94gNOYs0BMUzBDM';

            console.log('Web Push: Using VAPID key starting with:', vapidKey.substring(0, 5) + '...');

            const tokenPromise = getToken(messaging, {
                vapidKey: vapidKey,
                serviceWorkerRegistration: swRegistration,
            });

            const timeoutPromise = new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error('getToken timed out after 20 seconds')), 20000)
            );

            token = await Promise.race([tokenPromise, timeoutPromise]);
            console.log('Web Push: getToken resolved successfully');
        } catch (tokenError: any) {
            // AbortError / push service error = VAPID key not configured or push not available (common in dev environments)
            const isExpectedDevError =
                tokenError?.code === 'messaging/token-subscribe-failed' ||
                tokenError?.name === 'AbortError' ||
                tokenError?.message?.includes('push service') ||
                tokenError?.message?.includes('Registration failed - push service error') ||
                tokenError?.message?.includes('timed out');

            if (isExpectedDevError || tokenError?.message?.includes('Registration failed - push service error')) {
                console.warn(
                    'Web Push: Push service not available or timed out.',
                    '\n→ This is normal in local development (HTTP) or if VAPID keys are incorrect.',
                    '\n→ For web push to work reliably, you must be on HTTPS or localhost with valid keys.',
                    '\nError:', tokenError?.message
                );
            } else {
                console.error('Web Push: getToken failed:', tokenError?.message || tokenError);
                console.error('Web Push: Error details:', JSON.stringify(tokenError, null, 2));
                console.error('Web Push: Failed to get FCM token:', tokenError);
            }
            return;
        }

        if (token) {
            console.log('Web Push: FCM Token obtained:', token.substring(0, 20) + '...');
            await saveTokenToSupabase(userId, token);
        } else {
            console.warn('Web Push: No token received. Make sure VAPID key is configured.');
        }

        // Listen for foreground messages
        onMessage(messaging, (payload) => {
            console.log('Web Push: Foreground message received:', payload);

            const title = payload.notification?.title || 'إشعار جديد';
            const body = payload.notification?.body || '';

            const notifType = payload.data?.type === 'new_product' ? 'product'
                : payload.data?.type === 'order_status_update' ? 'order'
                    : 'general';

            // Show in-app notification toast
            showInAppNotification(title, body, notifType);

            // Also show native browser notification popup
            try {
                if (swRegistration && swRegistration.active) {
                    swRegistration.showNotification(title, {
                        body: body,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        dir: 'rtl',
                        tag: payload.data?.type || 'general',
                        data: payload.data, // Pass data so the SW click handler knows where to navigate
                        requireInteraction: true, // Native push stays on screen until dismissed
                    });
                } else if (Notification.permission === 'granted') {
                    // Fallback to window Notification API
                    const notification = new Notification(title, {
                        body: body,
                        icon: '/icon-192.png',
                        badge: '/icon-192.png',
                        dir: 'rtl',
                        tag: payload.data?.type || 'general',
                        data: payload.data,
                    } as NotificationOptions);

                    // Click to navigate
                    notification.onclick = () => {
                        window.focus();
                        if (notifType === 'order') {
                            window.location.href = '/cart';
                        }
                    };
                }
            } catch (e) {
                console.warn('Web Push: Native notification failed:', e);
            }

            // Play notification sound
            try {
                const audio = new Audio('/notification-sound.wav');
                audio.volume = 0.5;
                audio.play().catch(() => { });
            } catch (e) {
                // Sound play failed silently
            }
        });

    } catch (error) {
        console.warn('Web Push: Failed to initialize (non-critical):', error);
    }
}

/**
 * Register Firebase Messaging service worker
 */
async function registerFirebaseServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
        console.warn('Web Push: Service workers not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
            scope: '/firebase-cloud-messaging-push-scope',
        });
        console.log('Web Push: Service worker registered:', registration.scope);

        // Wait for the service worker to become active
        // NOTE: Do NOT use navigator.serviceWorker.ready here!
        // It waits for a SW controlling the current page scope, but our Firebase SW
        // has a different scope (/firebase-cloud-messaging-push-scope), so it hangs forever.
        if (registration.installing) {
            await new Promise<void>((resolve) => {
                registration.installing!.addEventListener('statechange', (e) => {
                    if ((e.target as ServiceWorker).state === 'activated') {
                        resolve();
                    }
                });
            });
        }
        console.log('Web Push: Service worker is active');
        return registration;
    } catch (error) {
        console.error('Web Push: Service worker registration failed:', error);
        return null;
    }
}

/**
 * Save FCM token to Supabase user_fcm_tokens table
 */
async function saveTokenToSupabase(userId: string, token: string) {
    console.log(`[DEBUG] saveTokenToSupabase called with userId: ${userId}, token: ${token ? token.substring(0, 10) + '...' : 'undefined'}`);

    if (!supabaseClient) {
        console.error('[DEBUG] saveTokenToSupabase: supabaseClient is undefined!');
        return;
    }

    try {
        const deviceName = getDeviceName();
        console.log(`[DEBUG] saveTokenToSupabase: Attempting upsert for device: ${deviceName}`);

        // Call the secure RPC function to assign token and remove from any other users
        // This ensures the device token always perfectly strict matches the CURRENT logged-in user
        const { error } = await supabaseClient
            .rpc('assign_fcm_token', {
                p_user_id: userId,
                p_token: token,
                p_device_name: deviceName
            });

        if (error) {
            console.error('[DEBUG] Push Notifications: Failed to save FCM token to Supabase:', error);
            console.error('[DEBUG] Supabase Error Details:', JSON.stringify(error));
        } else {
            console.log('[DEBUG] Push Notifications: FCM token saved successfully to Supabase for user:', userId);
        }
    } catch (e) {
        console.error('[DEBUG] Exception saving FCM token:', e);
    }
}

/**
 * Remove FCM token when user logs out
 */
export async function removePushNotificationToken() {
    if (!supabaseClient) return;

    try {
        if (isNativePlatform()) {
            const { PushNotifications } = await import('@capacitor/push-notifications');
            await PushNotifications.removeAllListeners();
        }
        // For web, the token will be invalidated automatically when user logs out
    } catch (error) {
        console.error('Failed to remove push notification token:', error);
    }
}

/**
 * Get device name for token identification
 */
function getDeviceName(): string {
    if (isNativePlatform()) {
        const ua = navigator.userAgent;
        if (ua.includes('Android')) return 'android';
        if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
        return 'native';
    }

    // Web browser detection
    const ua = navigator.userAgent;
    if (ua.includes('Chrome') && !ua.includes('Edge')) return 'web-chrome';
    if (ua.includes('Firefox')) return 'web-firefox';
    if (ua.includes('Safari') && !ua.includes('Chrome')) return 'web-safari';
    if (ua.includes('Edge')) return 'web-edge';
    return 'web';
}

/**
 * Show YouTube-style in-app banner notification
 */
export function showInAppNotification(title: string, body: string, type: 'order' | 'product' | 'general' = 'general') {
    // Remove any existing notification
    const existing = document.getElementById('yt-notification-banner');
    if (existing) existing.remove();

    // Determine icon & accent color based on type
    const config = {
        order: { icon: '📦', accent: 'linear-gradient(135deg, #6366f1, #8b5cf6)', accentSolid: '#6366f1' },
        product: { icon: '🛍️', accent: 'linear-gradient(135deg, #10b981, #34d399)', accentSolid: '#10b981' },
        general: { icon: '🔔', accent: 'linear-gradient(135deg, #f59e0b, #fbbf24)', accentSolid: '#f59e0b' },
    }[type];

    // Add styles (only once)
    if (!document.getElementById('yt-notif-styles')) {
        const style = document.createElement('style');
        style.id = 'yt-notif-styles';
        style.textContent = `
            @keyframes ytNotifSlideIn {
                0% { transform: translateY(-120%); opacity: 0; }
                60% { transform: translateY(4px); opacity: 1; }
                100% { transform: translateY(0); opacity: 1; }
            }
            @keyframes ytNotifSlideOut {
                0% { transform: translateY(0); opacity: 1; }
                100% { transform: translateY(-120%); opacity: 0; }
            }
            @keyframes ytNotifProgress {
                from { width: 100%; }
                to { width: 0%; }
            }
            @keyframes ytNotifPulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.15); }
            }
            .yt-notif-banner {
                position: fixed;
                top: 12px;
                left: 12px;
                right: 12px;
                z-index: 999999;
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px) saturate(180%);
                -webkit-backdrop-filter: blur(20px) saturate(180%);
                border-radius: 20px;
                padding: 0;
                box-shadow: 
                    0 8px 40px rgba(0, 0, 0, 0.12),
                    0 2px 8px rgba(0, 0, 0, 0.08),
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
                display: flex;
                flex-direction: column;
                direction: rtl;
                font-family: 'Tajawal', sans-serif;
                animation: ytNotifSlideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
                overflow: hidden;
                max-width: 480px;
                margin: 0 auto;
                border: 1px solid rgba(0, 0, 0, 0.06);
            }
            .yt-notif-banner.removing {
                animation: ytNotifSlideOut 0.35s ease-in forwards;
            }
            .yt-notif-content {
                display: flex;
                align-items: center;
                gap: 14px;
                padding: 14px 16px;
            }
            .yt-notif-icon {
                width: 48px;
                height: 48px;
                border-radius: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
                flex-shrink: 0;
                animation: ytNotifPulse 0.6s ease-out;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .yt-notif-text {
                flex: 1;
                min-width: 0;
            }
            .yt-notif-title {
                font-weight: 800;
                font-size: 14px;
                color: #1a1a1a;
                margin: 0 0 3px 0;
                line-height: 1.3;
            }
            .yt-notif-body {
                font-size: 13px;
                color: #64748b;
                margin: 0;
                line-height: 1.4;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            .yt-notif-close {
                width: 32px;
                height: 32px;
                border-radius: 50%;
                border: none;
                background: rgba(0, 0, 0, 0.05);
                color: #94a3b8;
                font-size: 18px;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                transition: all 0.2s;
                line-height: 1;
                padding: 0;
            }
            .yt-notif-close:hover {
                background: rgba(0, 0, 0, 0.1);
                color: #475569;
            }
            .yt-notif-progress {
                height: 3px;
                border-radius: 0 0 20px 20px;
                animation: ytNotifProgress 5s linear forwards;
            }
            @media (prefers-color-scheme: dark) {
                .yt-notif-banner {
                    background: rgba(30, 30, 30, 0.95);
                    border-color: rgba(255, 255, 255, 0.08);
                    box-shadow:
                        0 8px 40px rgba(0, 0, 0, 0.4),
                        0 2px 8px rgba(0, 0, 0, 0.3),
                        inset 0 1px 0 rgba(255, 255, 255, 0.05);
                }
                .yt-notif-title { color: #f1f5f9; }
                .yt-notif-body { color: #94a3b8; }
                .yt-notif-close {
                    background: rgba(255, 255, 255, 0.08);
                    color: #64748b;
                }
                .yt-notif-close:hover {
                    background: rgba(255, 255, 255, 0.15);
                    color: #94a3b8;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // Build banner
    const banner = document.createElement('div');
    banner.id = 'yt-notification-banner';
    banner.className = 'yt-notif-banner';
    banner.innerHTML = `
        <div class="yt-notif-content">
            <div class="yt-notif-icon" style="background: ${config.accent};">
                ${config.icon}
            </div>
            <div class="yt-notif-text">
                <div class="yt-notif-title">${title}</div>
                <div class="yt-notif-body">${body}</div>
            </div>
            <button class="yt-notif-close" aria-label="إغلاق">✕</button>
        </div>
        <div class="yt-notif-progress" style="background: ${config.accent};"></div>
    `;

    document.body.appendChild(banner);

    // Play notification sound
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
        oscillator.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch (e) {
        // Audio not available, silently ignore
    }

    // Dismiss function
    const dismiss = () => {
        banner.classList.add('removing');
        setTimeout(() => banner.remove(), 350);
    };

    // Close button
    banner.querySelector('.yt-notif-close')?.addEventListener('click', dismiss);

    // Tap to dismiss
    banner.addEventListener('click', (e) => {
        if (!(e.target as Element).closest('.yt-notif-close')) {
            dismiss();
        }
    });

    // Auto-dismiss after 5 seconds
    setTimeout(dismiss, 5000);
}
