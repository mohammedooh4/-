'use client';

import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface MobileLayoutProps {
  children: React.ReactNode;
}

export function MobileLayout({ children }: MobileLayoutProps) {
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    // Check if running in Capacitor
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      // Hide splash screen after app loads
      SplashScreen.hide();
      
      // Set status bar style
      StatusBar.setStyle({ style: Style.Dark });
      StatusBar.setBackgroundColor({ color: '#ffffff' });
      
      // Handle back button on Android
      App.addListener('backButton', () => {
        // Add haptic feedback
        Haptics.impact({ style: ImpactStyle.Light });
        
        // You can add custom back button logic here
        // For now, let the default behavior handle it
      });
      
      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          // App became active
          console.log('App became active');
        } else {
          // App went to background
          console.log('App went to background');
        }
      });
    }
  }, []);

  return (
    <div className={`mobile-container ${isNative ? 'native-app' : 'web-app'}`}>
      <style jsx global>{`
        .mobile-container {
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
        }
        
        .native-app {
          padding-top: env(safe-area-inset-top);
          padding-bottom: env(safe-area-inset-bottom);
        }
        
        /* Prevent text selection and callout on mobile */
        .native-app * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        /* Smooth scrolling for mobile */
        .native-app {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
        }
        
        /* Hide scrollbar on mobile */
        .native-app::-webkit-scrollbar {
          display: none;
        }
        
        .native-app {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
      {children}
    </div>
  );
}