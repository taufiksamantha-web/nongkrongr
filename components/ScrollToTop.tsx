
import React, { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';

const ScrollToTop: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  useEffect(() => {
    window.addEventListener('scroll', toggleVisibility);
    return () => {
      window.removeEventListener('scroll', toggleVisibility);
    };
  }, []);

  return (
    <div 
        className={`fixed bottom-6 right-6 z-[99] transition-all duration-500 transform 
        ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
    >
      <button
        onClick={scrollToTop}
        className="group relative flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full 
        bg-navy-900 dark:bg-blue-600 text-white 
        shadow-2xl shadow-blue-900/40 dark:shadow-blue-500/30 
        border border-blue-700/50 dark:border-blue-400/50
        hover:bg-blue-800 dark:hover:bg-blue-500 
        hover:-translate-y-2 hover:scale-110 
        transition-all duration-300 ease-out backdrop-blur-sm"
        aria-label="Scroll to top"
      >
        {/* Decorative glow inside */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-400/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <ArrowUp 
            size={24} 
            strokeWidth={3}
            className="relative z-10 group-hover:animate-bounce transition-transform" 
        />
      </button>
    </div>
  );
};

export default ScrollToTop;
