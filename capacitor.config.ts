import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sumselcekfakta.app', // Ganti dengan ID unik, misal: com.namakamu.sumselcekfakta
  appName: 'SumselCekFakta',
  webDir: 'dist', // Penting: Vite build outputnya ke folder 'dist', bukan 'www'
  server: {
    androidScheme: 'https'
  },
  plugins: {
    // Konfigurasi plugin jika nanti pakai kamera/lokasi native
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#1e3a8a",
      showSpinner: true,
    }
  }
};

export default config;