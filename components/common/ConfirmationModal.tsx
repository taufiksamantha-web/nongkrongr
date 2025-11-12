import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isConfirming?: boolean; // Tambahkan prop ini
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ title, message, onConfirm, onCancel, confirmText = 'Hapus', cancelText = 'Batal', isConfirming = false }) => {
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-title"
    >
      <div 
        className="bg-card p-8 rounded-3xl shadow-xl w-full max-w-md space-y-4 transform transition-all animate-fade-in-down"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="confirmation-title" className="text-2xl font-bold font-jakarta text-primary dark:text-white">{title}</h2>
        <p className="text-muted">{message}</p>
        <div className="flex justify-end gap-4 pt-4">
          <button onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="px-6 py-2 bg-accent-pink text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-75 disabled:cursor-wait"
            disabled={isConfirming}
          >
            {isConfirming ? 'Memproses...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;