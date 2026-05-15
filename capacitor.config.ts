import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sanctuary.mihrab.app',        // ← هذا السطر فقط تغيّر
  appName: 'Sanctuary',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'sanctuary.app',
    cleartext: false,
  },
  android: {
    backgroundColor: '#000a00',
    allowMixedContent: false,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: true
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      largeIcon: 'ic_launcher',
      iconColor: '#ff0000'
    }
  }
};

export default config;
