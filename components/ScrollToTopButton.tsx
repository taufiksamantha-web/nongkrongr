
import React, { useState, useEffect } from 'react';
import { ArrowUpIcon } from '@heroicons/react/24/solid';

const ScrollToTopButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
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
    <button
      type="button"
      onClick={scrollToTop}
      // Adjusted position: bottom-32 on mobile to strictly avoid the floating dock and its popups
      // Removed backdrop blur and transparency for better visibility on all backgrounds
      className={`fixed bottom-32 right-4 lg:bottom-8 lg:right-8 z-[90] p-3.5 rounded-full bg-brand text-white shadow-2xl hover:bg-brand-light focus:outline-none transition-all duration-500 transform hover:scale-110 border border-white/20 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'
      }`}
      aria-label="Go to top"
    >
      <ArrowUpIcon className="h-6 w-6" />
    </button>
  );
};

export default ScrollToTopButton;
