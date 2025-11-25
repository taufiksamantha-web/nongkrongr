
import React, { useEffect, useState } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface FloatingNotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const FloatingNotification: React.FC<FloatingNotificationProps> = ({ message, type, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Trigger animation in
        const animTimer = setTimeout(() => setIsVisible(true), 50);
        
        // Auto close timer
        const closeTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 500); // Wait for animation out
        }, 5000); // 5 seconds display

        return () => {
            clearTimeout(animTimer);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 500);
    };

    const isSuccess = type === 'success';
    
    // Glassmorphism Styles with slightly more opacity for better readability at bottom corner
    const glassClasses = isSuccess
        ? 'bg-emerald-50 dark:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-100'
        : 'bg-rose-50 dark:bg-rose-900/80 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-100';

    const iconColor = isSuccess ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500 dark:text-rose-400';

    return (
        <div 
            className={`fixed bottom-24 left-4 right-4 md:left-auto md:bottom-8 md:right-8 z-[3000] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] transform flex justify-center md:justify-end pointer-events-none ${
                isVisible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-12 opacity-0 scale-95'
            }`}
        >
             <div className={`pointer-events-auto relative flex items-center gap-3 p-3 pr-10 md:pr-12 md:p-3.5 rounded-2xl border shadow-2xl shadow-black/10 backdrop-blur-xl w-full md:w-auto md:min-w-[320px] md:max-w-lg ${glassClasses}`}>
                {/* Icon */}
                <div className={`flex-shrink-0 ${iconColor}`}>
                    {isSuccess ? <CheckCircleIcon className="h-6 w-6" /> : <ExclamationCircleIcon className="h-6 w-6" />}
                </div>
                
                {/* Content: Column on Mobile (for readability), Row on Desktop (Compact 1-line) */}
                <div className="flex-1 flex flex-col md:flex-row md:items-center md:gap-2 min-w-0 mr-1">
                    <p className="font-bold text-sm font-jakarta whitespace-nowrap">
                        {isSuccess ? 'Berhasil' : 'Perhatian'}
                    </p>
                    {/* Dot separator only on desktop */}
                    <span className="hidden md:inline opacity-50">•</span>
                    
                    {/* Message - Truncated on desktop to keep 1 line, full on mobile */}
                    <p className="text-sm font-medium opacity-90 leading-snug break-words md:truncate" title={message}>
                        {message}
                    </p>
                </div>
                
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${iconColor}`}
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
};

export default FloatingNotification;
