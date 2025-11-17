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
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-auto max-w-[calc(100%-3rem)] sm:left-6 sm:translate-x-0 sm:max-w-md z-[2000] animate-fade-in-up">
             <div className={`flex items-center p-4 rounded-2xl shadow-lg ${bgColor} ${textColor}`}>
                <div className="flex-shrink-0">{icon}</div>
                <div className="ml-3 text-sm font-semibold">{message}</div>
                <button onClick={onClose} className="ml-auto -mx-1.5 -my-1.5 p-1.5 rounded-lg inline-flex h-8 w-8 hover:bg-black/10 focus:ring-2 focus:ring-black/20">
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                </button>
            </div>
        </div>
    )
};

export default FloatingNotification;