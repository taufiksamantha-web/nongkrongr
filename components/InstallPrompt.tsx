import React, { useEffect, useState } from 'react';
import { BeforeInstallPromptEvent } from '../types';
import { XMarkIcon, ArrowDownTrayIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/solid';

const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      
      // Logic Check:
      // Browser (Chrome) prevents this event from firing frequently if user dismissed it recently (Cool-down period).
      // If the event FIRES, it means the browser allows it. We should show it.
      // However, we check our local storage just to avoid spamming in the SAME session if they just closed it.
      
      const dismissedAt = localStorage.getItem('nongkrongr_install_dismissed');
      if (dismissedAt) {
        const diff = Date.now() - parseInt(dismissedAt, 10);
        // Reduced cool-down to 1 hour for our internal logic. 
        // Rely on the browser's stricter heuristic for long-term throttling.
        if (diff < 1 * 60 * 60 * 1000) { 
            return;
        }
      }

      // Show the UI
      setTimeout(() => setIsVisible(true), 2000); 
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsVisible(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsVisible(false);
      // Clear dismissal history if they accept, so they can install again if they uninstall later
      localStorage.removeItem('nongkrongr_install_dismissed');
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Save current timestamp to local storage
    localStorage.setItem('nongkrongr_install_dismissed', Date.now().toString());
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-[2000] animate-fade-in-down">
        <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl border border-brand/20 dark:border-brand/10 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 ring-1 ring-black/5">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand text-white rounded-xl flex items-center justify-center shadow-lg shadow-brand/30">
                    <DevicePhoneMobileIcon className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-bold text-primary dark:text-white text-sm leading-tight">Pasang Aplikasi?</h3>
                    <p className="text-xs text-muted mt-0.5">Akses lebih cepat & hemat kuota.</p>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDismiss}
                    className="p-2 text-muted hover:text-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                    aria-label="Tutup"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
                <button 
                    onClick={handleInstallClick}
                    className="bg-brand text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 transition-all flex items-center gap-1.5 active:scale-95"
                >
                    <ArrowDownTrayIcon className="h-4 w-4" />
                    Install
                </button>
            </div>
        </div>
    </div>
  );
};

export default InstallPrompt;