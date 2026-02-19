import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.studio123.productshowcase',
  appName: 'اسواق سجاد',
  webDir: 'out',
  bundledWebRuntime: false,

  server: {
    androidScheme: 'https',
    cleartext: true
  },

  android: {
    buildOptions: {
      keystorePath: 'keystore.jks',
      keystorePassword: 'android',
      keystoreAlias: 'android',
      keystoreAliasPassword: 'android'
    }
  },

  plugins: {
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true
    }
  }
};

export default config;
