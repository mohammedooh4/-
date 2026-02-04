import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { CartProvider } from '@/context/cart-context';
import { AuthProvider } from '@/context/auth-context';
import { BottomNavBar } from '@/components/bottom-nav-bar';
import { MobileLayout } from '@/components/mobile-layout';
import { Tajawal } from 'next/font/google';
import { cn } from '@/lib/utils';

const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['400', '500', '700', '800'],
  variable: '--font-tajawal',
});


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
        <meta name="theme-color" content="#598cfa" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={cn("font-body antialiased pb-20", tajawal.variable)}>
        <AuthProvider>
          <CartProvider>
            <MobileLayout>
              <main>{children}</main>
              <BottomNavBar />
              <Toaster />
            </MobileLayout>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
