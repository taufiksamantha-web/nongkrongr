import React from 'react';
import { WifiIcon } from '@heroicons/react/24/outline';

const DatabaseConnectionError: React.FC = () => {
  return (
    <div className="container mx-auto px-6 py-20 text-center">
      <div className="bg-yellow-50 dark:bg-yellow-500/10 border-l-4 border-yellow-400 p-8 rounded-2xl max-w-2xl mx-auto">
        <WifiIcon className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold font-jakarta text-yellow-800 dark:text-yellow-200">
          Tidak Dapat Terhubung ke Database
        </h2>
        <p className="mt-2 text-yellow-700 dark:text-yellow-300">
          Aplikasi ini tidak dapat mengambil data (seperti daftar kafe) karena koneksi ke database Supabase tidak tersedia di lingkungan pratinjau ini.
        </p>
        <p className="mt-4 text-sm text-muted">
          Ini adalah perilaku yang diharapkan saat berjalan di Google AI Studio. Fungsionalitas penuh, termasuk data kafe live, tersedia di versi aplikasi yang telah di-deploy.
        </p>
      </div>
    </div>
  );
};

export default DatabaseConnectionError;