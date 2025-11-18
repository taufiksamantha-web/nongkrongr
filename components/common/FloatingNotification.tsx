import React, { useEffect } from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface FloatingNotificationProps {
    message: string;
    type: 'success' | 'error';
    onClose: () => void;
}

const FloatingNotification: React.FC<FloatingNotificationProps> = ({ message, type, onClose }) => {
    const isSuccess = type === 'success';
    const bgColor = isSuccess ? 'bg-green-100 dark:bg-green-500/20' : 'bg-red-100 dark:bg-red-500/20';
    const textColor = isSuccess ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300';
    const icon = isSuccess ? <CheckCircleIcon className="h-6 w-6" /> : <ExclamationTriangleIcon className="h-6 w-6" />;
    
    useEffect(() => {
        const timer = setTimeout(onClose, 2000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 w-auto max-w-[calc(100%-2rem)] sm:max-w-lg z-[2000] animate-fade-in-down">
             <div className={`flex items-center justify-center text-center gap-3 p-4 rounded-2xl shadow-lg ${bgColor} ${textColor}`}>
                <div className="flex-shrink-0">{icon}</div>
                <div className="text-sm font-semibold line-clamp-2">{message}</div>
            </div>
        </div>
    )
};

export default FloatingNotification;