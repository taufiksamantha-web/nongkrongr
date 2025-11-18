
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
        const animTimer = setTimeout(() => setIsVisible(true), 10);
        
        // Auto close timer
        const closeTimer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(onClose, 300); // Wait for animation out
        }, 5000); // Updated to 5 seconds

        return () => {
            clearTimeout(animTimer);
            clearTimeout(closeTimer);
        };
    }, [onClose]);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    const isSuccess = type === 'success';
    
    // Glassmorphism Styles
    const containerClasses = isSuccess
        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-800 dark:text-emerald-200 shadow-emerald-500/10'
        : 'bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200 shadow-rose-500/10';

    const iconColor = isSuccess ? 'text-emerald-500' : 'text-rose-500';

    return (
        <div 
            className={`fixed top-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-[3000] transition-all duration-300 ease-in-out transform ${
                isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
            }`}
        >
             <div className={`relative flex items-start gap-3 p-4 rounded-2xl border shadow-xl backdrop-blur-xl ${containerClasses}`}>
                <div className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
                    {isSuccess ? <CheckCircleIcon className="h-6 w-6" /> : <ExclamationCircleIcon className="h-6 w-6" />}
                </div>
                <div className="flex-1 pt-0.5">
                    <p className="font-bold text-sm font-jakarta mb-0.5">
                        {isSuccess ? 'Berhasil!' : 'Perhatian'}
                    </p>
                    <p className="text-sm font-medium opacity-90 leading-snug">{message}</p>
                </div>
                <button 
                    onClick={handleClose}
                    className={`flex-shrink-0 p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors ${iconColor}`}
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
};

export default FloatingNotification;
