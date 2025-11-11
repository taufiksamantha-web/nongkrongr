import React, { useState, useEffect } from 'react';
import { settingsService } from '../../services/settingsService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { fileToBase64 } from '../../utils/fileUtils';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';

const HERO_BACKGROUND_KEY = 'hero_background_url';

const WebsiteSettingsPanel: React.FC = () => {
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      const url = await settingsService.getSetting(HERO_BACKGROUND_KEY);
      setHeroBgUrl(url);
      setIsLoading(false);
    };
    fetchSettings();
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setNotification(null);

    try {
      const base64 = await fileToBase64(file);
      const newUrl = await cloudinaryService.uploadImage(base64);
      const { error } = await settingsService.updateSetting(HERO_BACKGROUND_KEY, newUrl);
      
      if (error) throw error;

      setHeroBgUrl(newUrl);
      setNotification({ message: 'Background berhasil diperbarui!', type: 'success' });
    } catch (err: any) {
      console.error('Failed to update hero background:', err);
      setNotification({ message: `Gagal memperbarui: ${err.message}`, type: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
      <h2 className="text-2xl font-bold font-jakarta mb-4">Pengaturan Website</h2>
      <div>
        <h3 className="font-semibold text-lg mb-4">Background Hero Section</h3>
        {isLoading ? (
          <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
        ) : (
          <div>
            <p className="text-sm text-muted mb-2">Gambar saat ini:</p>
            <ImageWithFallback src={heroBgUrl} alt="Hero background preview" className="w-full h-40 object-cover rounded-2xl mb-4" fallbackText="Belum ada background kustom."/>
            <label htmlFor="hero-bg-upload" className={`w-full text-center cursor-pointer bg-brand/10 text-brand font-semibold p-3 rounded-xl block hover:bg-brand/20 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
              {isUploading ? 'Mengupload...' : 'Unggah Gambar Baru'}
            </label>
            <input id="hero-bg-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebsiteSettingsPanel;