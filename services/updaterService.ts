
import { Capacitor } from '@capacitor/core';

/**
 * Updater Service - Real Implementation with Capgo
 * Dokumentasi: https://capgo.app/docs/
 */
export const UpdaterService = {
    /**
     * Inisialisasi dan cek update.
     * Biasanya dipanggil di App.tsx saat startup atau resume.
     */
    checkForUpdates: async (currentVersion: string) => {
        if (!Capacitor.isNativePlatform()) return;

        try {
            // Kita menggunakan dynamic import dengan vite-ignore agar tidak error di lingkungan build
            const { CapacitorUpdater } = await import(/* @vite-ignore */ '@capgo/capacitor-updater');
            
            console.log(`[Updater] Memulai sinkronisasi... Versi saat ini: ${currentVersion}`);
            
            // 1. Beritahu server bahwa versi ini sukses berjalan (Self-healing logic)
            await CapacitorUpdater.notifyAppReady();

            // 2. Cek apakah ada bundle baru di server Capgo
            // Plugin akan otomatis mendownload di background jika ada versi baru
            const update = await CapacitorUpdater.sync();
            
            if (update.version !== currentVersion) {
                console.log(`[Updater] Versi baru ditemukan: ${update.version}. Akan diterapkan saat restart.`);
            }
        } catch (error) {
            console.error('[Updater] Gagal sinkronisasi:', error);
        }
    },

    /**
     * Memaksa aplikasi untuk langsung reload ke versi terbaru yang sudah didownload
     */
    applyUpdateImmediately: async () => {
        if (!Capacitor.isNativePlatform()) return;
        
        try {
            const { CapacitorUpdater } = await import(/* @vite-ignore */ '@capgo/capacitor-updater');
            const latest = await CapacitorUpdater.getLatest();
            
            if (latest) {
                await CapacitorUpdater.set(latest);
                // Aplikasi akan reload otomatis ke kode baru
            }
        } catch (e) {
            console.error('[Updater] Gagal menerapkan update:', e);
        }
    }
};
