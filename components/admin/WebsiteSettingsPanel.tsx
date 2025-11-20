
import React, { useState, useEffect, useCallback } from 'react';
import { settingsService } from '../../services/settingsService';
import { cloudinaryService } from '../../services/cloudinaryService';
import { fileToBase64 } from '../../utils/fileUtils';
import FloatingNotification from '../common/FloatingNotification';
import ImageWithFallback from '../common/ImageWithFallback';

const HERO_BACKGROUND_KEY = 'hero_background_url';

// Toggle Switch Component
const ToggleSwitch: React.FC<{ label: string; description?: string; checked: boolean; onChange: (val: boolean) => void; disabled?: boolean }> = ({ label, description, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
        <div>
            <p className="font-semibold text-primary dark:text-white">{label}</p>
            {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
        </div>
        <button
            onClick={() => !disabled && onChange(!checked)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 ${checked ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        >
            <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`}
            />
        </button>
    </div>
);

const WebsiteSettingsPanel: React.FC = () => {
  const [heroBgUrl, setHeroBgUrl] = useState<string | null>(null);
  const [socialLinks, setSocialLinks] = useState({
    instagram: '',
    tiktok: '',
    twitter: '',
  });
  
  // Homepage Visibility Settings
  const [visibilitySettings, setVisibilitySettings] = useState({
      showRecommendations: true,
      showCOTW: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    const [heroUrl, instagramUrl, tiktokUrl, twitterUrl, showRecs, showCotw] = await Promise.all([
      settingsService.getSetting(HERO_BACKGROUND_KEY),
      settingsService.getSetting('social_instagram_url'),
      settingsService.getSetting('social_tiktok_url'),
      settingsService.getSetting('social_twitter_url'),
      settingsService.getSetting('show_recommendations_section'),
      settingsService.getSetting('show_cotw_section'),
    ]);
    setHeroBgUrl(heroUrl);
    setSocialLinks({
      instagram: instagramUrl || '',
      tiktok: tiktokUrl || '',
      twitter: twitterUrl || '',
    });
    setVisibilitySettings({
        showRecommendations: showRecs !== 'false', // Default true if null
        showCOTW: showCotw !== 'false', // Default true if null
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
      await fetchSettings();
    } catch (err: any) {
      setNotification({ message: `Gagal menyimpan: ${err.message}`, type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveVisibility = async () => {
      setIsSaving(true);
      setNotification(null);
      try {
          await Promise.all([
              settingsService.updateSetting('show_recommendations_section', String(visibilitySettings.showRecommendations)),
              settingsService.updateSetting('show_cotw_section', String(visibilitySettings.showCOTW)),
          ]);
          setNotification({ message: 'Pengaturan tampilan Homepage berhasil disimpan!', type: 'success' });
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
    <div className="space-y-8">
      {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
      
      <h2 className="text-2xl font-bold font-jakarta text-center bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
          Pengaturan Website
      </h2>
      
      {isLoading ? (
        <div className="space-y-4">
            <div className="w-1/2 h-6 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
            <div className="w-full h-40 bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse"></div>
            <div className="w-full h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse"></div>
        </div>
      ) : (
        <>
            {/* Section 1: Homepage Appearance */}
            <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">Tampilan Homepage</h3>
                <div className="space-y-2">
                    <ToggleSwitch 
                        label="Tampilkan Rekomendasi Spesial" 
                        description="Slider rekomendasi berdasarkan algoritma cerdas di bagian atas."
                        checked={visibilitySettings.showRecommendations}
                        onChange={(val) => setVisibilitySettings(prev => ({...prev, showRecommendations: val}))}
                        disabled={isSaving}
                    />
                    <ToggleSwitch 
                        label="Tampilkan Cafe of The Week" 
                        description="Kartu sorotan khusus untuk satu kafe pilihan admin."
                        checked={visibilitySettings.showCOTW}
                        onChange={(val) => setVisibilitySettings(prev => ({...prev, showCOTW: val}))}
                        disabled={isSaving}
                    />
                </div>
                <div className="mt-4 text-right">
                     <button onClick={handleSaveVisibility} disabled={isSaving} className="px-6 py-2 bg-brand text-white font-bold rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50 text-sm">
                        {isSaving ? 'Menyimpan...' : 'Simpan Tampilan'}
                    </button>
                </div>
            </div>

            {/* Section 2: Hero Image */}
            <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">Background Utama</h3>
                <div>
                    <p className="text-sm text-muted mb-3">Gambar ini akan muncul di bagian paling atas (Hero Section) halaman utama.</p>
                    <ImageWithFallback src={heroBgUrl} alt="Hero background preview" className="w-full h-48 object-cover rounded-2xl mb-4 border border-border" fallbackText="Belum ada background kustom." width={400} height={200}/>
                    <label htmlFor="hero-bg-upload" className={`w-full text-center cursor-pointer bg-brand/10 text-brand font-semibold p-3 rounded-xl block hover:bg-brand/20 transition-colors border-2 border-dashed border-brand/30 ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                      {isUploading ? 'Mengupload...' : 'Ganti Gambar Background'}
                    </label>
                    <input id="hero-bg-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" disabled={isUploading}/>
                </div>
            </div>

            {/* Section 3: Social Media */}
            <div className="bg-card rounded-2xl border border-border p-5">
                <h3 className="font-bold text-lg mb-4 border-b border-border pb-2">Link Media Sosial</h3>
                <div className="space-y-4">
                     <div>
                        <label htmlFor="instagram" className="font-medium text-sm text-muted">Instagram URL</label>
                        <input id="instagram" name="instagram" value={socialLinks.instagram} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg focus:ring-2 focus:ring-brand outline-none"/>
                    </div>
                     <div>
                        <label htmlFor="tiktok" className="font-medium text-sm text-muted">TikTok URL</label>
                        <input id="tiktok" name="tiktok" value={socialLinks.tiktok} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg focus:ring-2 focus:ring-brand outline-none"/>
                    </div>
                     <div>
                        <label htmlFor="twitter" className="font-medium text-sm text-muted">Twitter/X URL</label>
                        <input id="twitter" name="twitter" value={socialLinks.twitter} onChange={handleSocialLinkChange} className="mt-1 w-full p-2 border border-border bg-soft dark:bg-gray-700/50 rounded-lg focus:ring-2 focus:ring-brand outline-none"/>
                    </div>
                    <button onClick={handleSaveSocialLinks} disabled={isSaving} className="w-full bg-brand text-white font-bold py-2.5 rounded-xl hover:bg-brand/90 transition-colors disabled:opacity-50 text-sm mt-2">
                        {isSaving ? 'Menyimpan...' : 'Simpan Link Sosmed'}
                    </button>
                </div>
            </div>
        </>
      )}
    </div>
  );
};

export default WebsiteSettingsPanel;
