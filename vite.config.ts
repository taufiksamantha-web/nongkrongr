
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      external: ['@capgo/capacitor-updater'],
      output: {
        globals: {
          '@capgo/capacitor-updater': 'CapacitorUpdater'
        },
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'react-vendor';
            }
            if (id.includes('leaflet')) {
              return 'map-vendor';
            }
            if (id.includes('supabase')) {
              return 'supabase-vendor';
            }
            if (id.includes('lucide')) {
              return 'ui-vendor';
            }
            return 'vendor';
          }
        },
      },
    },
  },
});
