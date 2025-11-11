import React, { useState } from 'react';
import { ShareIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

interface ShareButtonProps {
  cafeName: string;
  cafeDescription: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ cafeName, cafeDescription }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: cafeName,
      text: `Cobain ke ${cafeName} yuk! Katanya tempatnya asik. ${cafeDescription.substring(0, 100)}... Cek di Nongkrongr:`,
      url: window.location.href,
    };

    // Use Web Share API if available (mostly on mobile)
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback to copy to clipboard for desktop
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500); // Reset feedback after 2.5 seconds
      } catch (error) {
        console.error('Failed to copy link:', error);
        alert('Gagal menyalin link.');
      }
    }
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold border-2 transition-all duration-300 ${copied ? 'bg-green-100 text-green-700 border-green-200' : 'bg-soft border-border hover:border-brand/50'}`}
      aria-label="Bagikan kafe ini"
      style={{ minWidth: '110px', justifyContent: 'center' }}
    >
      {copied ? (
        <>
          <ClipboardDocumentCheckIcon className="h-6 w-6" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <ShareIcon className="h-6 w-6" />
          <span>Share</span>
        </>
      )}
    </button>
  );
};

export default ShareButton;
