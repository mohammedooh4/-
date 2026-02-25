import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/context/auth-context';
import { FavoritesProvider } from '@/context/favorites-context';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { MobileLayout } from '@/components/mobile-layout';
import { cn } from '@/lib/utils';

// Using system fonts instead of Google Fonts to avoid network issues
const systemFonts = {
  className: 'font-sans',
  style: {
    fontFamily: '"Tajawal", "Noto Sans Arabic", "Arial", sans-serif',
  },
};


export const metadata: Metadata = {
  title: 'اسواق سجاد',
  description: 'عرض أنيق لأجود منتجاتنا.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'اسواق سجاد',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.OneSignalDeferred = window.OneSignalDeferred || [];
              OneSignalDeferred.push(async function(OneSignal) {
                await OneSignal.init({
                  appId: "52b04508-c26d-4008-8df4-6b20384617eb",
                });
              });
            `,
          }}
        />
      </head>
      <body className={cn("font-body antialiased pb-20", systemFonts.className)} style={systemFonts.style}>
        {/* Disable Service Worker on Native Capacitor Platforms to prevent white screen caching issues */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(function(registrations) {
                    for(let registration of registrations) {
                      // Don't unregister our manual firebase-messaging-sw.js
                      if (!registration.active || !registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
                        registration.unregister();
                        console.log('Unregistered PWA service worker on native platform');
                      }
                    }
                  });
                }
              }
            `,
          }}
        />
        <AuthProvider>
          <FavoritesProvider>
            <CartProvider>
              <MobileLayout>
                <main>{children}</main>
                <BottomNavBar />
                <Toaster />
              </MobileLayout>
            </CartProvider>
          </FavoritesProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

