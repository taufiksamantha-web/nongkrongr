import React from 'react';
import { CheckCircle, Info, XCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const styles = {
    success: {
      bg: 'bg-green-50 dark:bg-navy-800',
      border: 'border-green-200 dark:border-green-800',
      text: 'text-green-800 dark:text-green-100',
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
    },
    error: {
      bg: 'bg-red-50 dark:bg-navy-800',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-100',
      icon: <XCircle className="w-6 h-6 text-red-500" />,
    },
    info: {
      bg: 'bg-blue-50 dark:bg-navy-800',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-100',
      icon: <Info className="w-6 h-6 text-blue-500" />,
    },
  };

  const currentStyle = styles[type];

  return (
    <div className={`fixed top-6 right-4 md:right-6 z-[100] animate-bounce-in max-w-sm w-full shadow-2xl rounded-2xl overflow-hidden border ${currentStyle.border} backdrop-blur-md bg-opacity-95 dark:bg-opacity-95`}>
      <div className={`flex items-start p-4 gap-3 ${currentStyle.bg}`}>
        <div className="flex-shrink-0 mt-0.5">
          {currentStyle.icon}
        </div>
        <div className="flex-1 w-0">
          <p className={`text-sm font-medium ${currentStyle.text}`}>
            {message}
          </p>
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className={`rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
            onClick={onClose}
          >
            <span className="sr-only">Close</span>
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
      {/* Progress Bar Animation (Visual flair) */}
      <div className="h-1 w-full bg-gray-200 dark:bg-gray-700">
         <div className={`h-full ${type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'} animate-[width_3s_linear]`} style={{width: '100%'}}></div>
      </div>
    </div>
  );
};

export default Toast;