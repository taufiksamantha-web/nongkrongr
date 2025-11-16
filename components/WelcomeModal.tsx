
import React, { useState, useEffect } from 'react';

interface WelcomeModalProps {
  onClose: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onClose }) => {
  const [isShowing, setIsShowing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsShowing(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsShowing(false);
    setTimeout(onClose, 300);
  };

  return (
    <div
      className={`fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300 ${isShowing ? 'opacity-100' : 'opacity-0'}`}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className={`bg-card rounded-4xl shadow-2xl p-8 md:p-12 text-center max-w-md mx-4 transform transition-all duration-300 ${isShowing ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-6xl mb-4 animate-bounce">🤙</div>
        <h2 id="welcome-modal-title" className="text-3xl md:text-4xl font-extrabold font-jakarta bg-clip-text text-transparent bg-gradient-to-r from-brand to-accent-pink mb-4">
          Selamat Datang!
        </h2>
        <p className="text-muted text-lg mb-8">
          Nongkrongr siap membantumu menemukan cafe paling estetik dan PW di Sumatera Selatan.
        </p>
        <button
          onClick={handleClose}
          className="bg-brand text-white font-bold py-4 px-10 rounded-2xl text-lg hover:bg-brand/90 transition-all duration-300 transform hover:scale-105 shadow-lg focus:ring-4 focus:ring-brand/30"
          aria-label="Mulai menjelajah"
        >
          Mulai Jelajah!
        </button>
      </div>
    </div>
  );
};

export default WelcomeModal;