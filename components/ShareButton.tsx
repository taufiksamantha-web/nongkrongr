
import React, { useState } from 'react';
import { ShareIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/solid';

interface ShareButtonProps {
  cafeName: string;
  cafeDescription: string;
  className?: string;
}

const ShareButton: React.FC<ShareButtonProps> = ({ cafeName, cafeDescription, className }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const shareData = {
      title: cafeName,
      text: `Cobain ke ${cafeName} yuk! Katanya tempatnya asik. ${cafeDescription.substring(0, 100)}... Cek di Nongkrongr:`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch (error) {
        console.error('Failed to copy link:', error);
        alert('Gagal menyalin link.');
      }
    }
  };

  const buttonClass = className || `inline-flex items-center justify-center p-3 rounded-full transition-all duration-300 shadow-sm active:scale-90 ${copied ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-soft border-2 border-border hover:bg-brand/10 hover:text-brand hover:border-brand/20 text-muted'}`;

  return (
    <button
      onClick={handleShare}
      className={buttonClass}
      aria-label="Bagikan kafe ini"
      title="Bagikan"
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className="h-6 w-6" />
      ) : (
        <ShareIcon className="h-6 w-6" />
      )}
    </button>
  );
};

export default ShareButton;
