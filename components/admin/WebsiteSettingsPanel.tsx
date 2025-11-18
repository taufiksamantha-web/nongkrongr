import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { fileToBase64 } from '../../utils/fileUtils';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';

const HERO_BACKGROUND_KEY = 'hero_background_url';

const WebsiteSettingsPanel: React.FC = () => {
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    tiktok: '',
    twitter: '',
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const [heroUrl, instagramUrl, tiktokUrl, twitterUrl] = await Promise.all([
      settingsService.getSetting(HERO_BACKGROUND_KEY),
      settingsService.getSetting('social_instagram_url'),
      settingsService.getSetting('social_tiktok_url'),
      settingsService.getSetting('social_twitter_url'),
    ]);
    setHeroBgUrl(heroUrl);
    setSocialLinks({
      instagram: instagramUrl || '',
      tiktok: tiktokUrl || '',
      twitter: twitterUrl || '',
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  
  const handleSocialLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSocialLinks(prev => ({...prev, [name]: value }));
  };
  
  const handleSaveSocialLinks = async () => {
    setIsSaving(true);
    setNotification(null);
    try {
      await Promise.all([
        settingsService.updateSetting('social_instagram_url', socialLinks.instagram),
        settingsService.updateSetting('social_tiktok_url', socialLinks.tiktok),
        settingsService.updateSetting('social_twitter_url', socialLinks.twitter),
      ]);
      setNotification({ message: 'Link media sosial berhasil disimpan!', type: 'success' });
      // Re-fetch to confirm the save was successful.
      await fetchSettings();
    } catch (err: any) {
      setNotification({ message: `Gagal menyimpan: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

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
    <div className="space-y-6">
      {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
      <h2 className="text-2xl font-bold font-jakarta">Pengaturan Website</h2>
      
      {isLoading ? (
        <div className="space-y-4">
            <div className="w-1/2 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
            <div>
                <h3 className="font-semibold text-lg mb-4">Background Hero Section</h3>
                <div>
                    <p className="text-sm text-muted mb-2">Gambar saat ini:</p>
                    <ImageWithFallback src={heroBgUrl} alt="Hero background preview" className="w-full h-40 object-cover rounded-2xl mb-4" fallbackText="Belum ada background kustom." width={400} height={200}/>
                    <label htmlFor="hero-bg-upload" className={`w-full text-center cursor-pointer bg-brand/10 text-brand font-semibold p-3 rounded-xl block hover:bg-brand/20 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? 'Mengupload...' : 'Unggah Gambar Baru'}
                    </label>
                    <input id="hero-bg-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                </div>
            </div>

            <div className="pt-4 border-t border-border">
                <h3 className="font-semibold text-lg mb-4">Link Media Sosial</h3>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="instagram" className="font-medium text-sm text-muted">Instagram URL</label>
                        <input id="instagram" name="instagram" value={socialLinks.instagram} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="tiktok" className="font-medium text-sm text-muted">TikTok URL</label>
                        <input id="tiktok" name="tiktok" value={socialLinks.tiktok} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg"/>
                    </div>
                     <div>
                        <label htmlFor="twitter" className="font-medium text-sm text-muted">Twitter/X URL</label>
                        <input id="twitter" name="twitter" value={socialLinks.twitter} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg"/>
                    </div>
                    <button onClick={handleSaveSocialLinks} disabled={isSaving} className="w-full bg-brand text-white font-bold py-2 rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50">
                        {isSaving ? 'Menyimpan...' : 'Simpan Link'}
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default WebsiteSettingsPanel;