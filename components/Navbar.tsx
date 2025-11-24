import React, { useState, useEffect } from 'react';
import { FileText, Sun, Moon, ChevronRight, ScanFace } from 'lucide-react';
import { AppConfig } from '../types';

interface NavbarProps {
  currentPage: string;
  onNavigate: (page: any) => void;
  config: AppConfig;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate, config, isDarkMode, toggleTheme }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navAction = (page: string) => {
    onNavigate(page);
    setIsMobileMenuOpen(false);
  };

  const handleThemeToggle = () => {
      toggleTheme();
  };

  // Helper untuk mengatur class menu desktop secara dinamis
  const getDesktopMenuClass = (pageName: string) => {
    const isActive = currentPage === pageName;
    
    // Base styles
    let classes = "px-4 py-2 rounded-full font-semibold transition text-sm flex items-center gap-1.5 ";

    if (isActive) {
      // Active State: Branding Color (Solid Blue) & White Text
      classes += "bg-blue-900 text-white dark:bg-blue-600 shadow-md shadow-blue-900/20 transform scale-105";
    } else {
      // Inactive State
      classes += "text-gray-600 dark:text-gray-300 hover:text-blue-900 dark:hover:text-blue-400 hover:bg-gray-100/50 dark:hover:bg-navy-800";
    }
    return classes;
  };

  // Helper untuk tombol toggle theme di desktop
  const getThemeBtnClass = () => {
    return "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-navy-800";
  };

  return (
    <>
      <nav 
        className={`fixed w-full z-50 transition-all duration-300 border-b 
        bg-white/90 dark:bg-navy-900/90 backdrop-blur-md border-gray-200/50 dark:border-navy-700/50 shadow-sm`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* Logo Section */}
            <div className="flex items-center cursor-pointer group flex-shrink-1 min-w-0" onClick={() => navAction('home')}>
              <div className="flex items-center gap-2 md:gap-3">
                
                {/* Primary Logo - Visible on Mobile now, scaled down */}
                {config.logoUrl && (
                    <div className="flex items-center transition-transform group-hover:scale-105 shrink-0">
                        <img src={config.logoUrl} alt="Logo" className="w-8 h-8 md:w-10 md:h-10 object-contain" />
                    </div>
                )}

                {/* Separator - Only on Desktop to save space on mobile */}
                {config.logoUrl && config.secondaryLogoUrl && (
                    <div className="hidden md:block h-8 w-[1px] bg-gray-400/50 dark:bg-white/20 mx-1"></div>
                )}

                {/* Secondary Logo */}
                {config.secondaryLogoUrl && (
                    <img src={config.secondaryLogoUrl} alt="Logo Partner" className="h-8 w-auto md:h-10 object-contain transition-transform group-hover:scale-105 rounded-none shrink-0" />
                )}
                
                {/* Text - Scaled for mobile */}
                <div className="flex flex-col ml-0.5 md:ml-1 min-w-0">
                  <span className="font-bold text-lg md:text-xl leading-none transition-colors text-blue-900 dark:text-white truncate">
                    Sumsel<span className="text-blue-600 dark:text-blue-400">CekFakta</span>
                  </span>
                  <span className="text-[9px] md:text-[10px] tracking-widest uppercase font-semibold text-gray-500 dark:text-gray-400 truncate">
                    Diskominfo Prov. Sumsel
                  </span>
                </div>
              </div>
            </div>
            
            {/* Desktop Menu */}
            <div className="hidden md:flex items-center space-x-1">
              <button 
                onClick={() => navAction('home')}
                className={getDesktopMenuClass('home')}
              >
                Beranda
              </button>
              <button 
                onClick={() => navAction('stats')}
                className={getDesktopMenuClass('stats')}
              >
                Statistik
              </button>
              <button 
                onClick={() => navAction('ticket')}
                className={getDesktopMenuClass('ticket')}
              >
                Lacak Tiket
              </button>
               <button 
                onClick={() => navAction('deepfake')}
                className={getDesktopMenuClass('deepfake')}
              >
                <ScanFace size={16} />
                Cek Media AI
              </button>

              {/* Spacer */}
              <div className="w-2"></div>

              <button 
                onClick={() => navAction('report')}
                className={`px-5 py-2.5 rounded-full text-sm font-bold transition shadow-lg flex items-center gap-2 hover:-translate-y-0.5 ${currentPage === 'report' ? 'bg-blue-900 text-white dark:bg-blue-600 shadow-blue-900/30' : 'bg-blue-900 dark:bg-blue-700 text-white hover:bg-blue-800 dark:hover:bg-blue-600 shadow-blue-900/30'}`}
              >
                <FileText className="w-4 h-4" />
                Lapor Hoax
              </button>

              {/* Toggle Dark Mode (Desktop) */}
              <button 
                onClick={toggleTheme}
                className={`p-2.5 rounded-full transition ml-2 ${getThemeBtnClass()}`}
                title="Ganti Tema"
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>

            {/* Mobile Menu Button - ANIMATED HAMBURGER */}
            <div className="flex items-center gap-4 md:hidden">
              <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="group relative w-10 h-10 rounded-xl bg-gray-100 dark:bg-navy-800 flex items-center justify-center transition-colors hover:bg-gray-200 dark:hover:bg-navy-700 focus:outline-none"
                aria-label="Toggle Menu"
              >
                <div className="relative w-5 h-4 overflow-visible">
                    {/* Top Line */}
                    <span 
                        className={`absolute left-0 w-full h-0.5 bg-gray-800 dark:bg-white rounded-full transform transition-all duration-300 ease-in-out origin-center
                        ${isMobileMenuOpen ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`}
                    />
                    
                    {/* Middle Line */}
                    <span 
                        className={`absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-800 dark:bg-white rounded-full transition-all duration-200 ease-in-out
                        ${isMobileMenuOpen ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`}
                    />
                    
                    {/* Bottom Line */}
                    <span 
                        className={`absolute left-0 w-full h-0.5 bg-gray-800 dark:bg-white rounded-full transform transition-all duration-300 ease-in-out origin-center
                        ${isMobileMenuOpen ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0'}`}
                    />
                </div>
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown (Glass Effect) */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white/90 dark:bg-navy-900/95 backdrop-blur-xl border-t border-gray-100 dark:border-navy-800 absolute w-full shadow-xl animate-fade-in-up">
            <div className="px-4 pt-2 pb-6 space-y-2">
              <button 
                onClick={() => navAction('home')}
                className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-base font-semibold transition ${currentPage === 'home' ? 'bg-blue-900 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-navy-800'}`}
              >
                <span>Beranda</span>
                <ChevronRight size={16} className={currentPage === 'home' ? 'text-white' : 'text-gray-400'} />
              </button>
              <button
                onClick={() => navAction('stats')} 
                className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-base font-semibold transition ${currentPage === 'stats' ? 'bg-blue-900 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-navy-800'}`}>
                <span>Statistik Data</span>
                <ChevronRight size={16} className={currentPage === 'stats' ? 'text-white' : 'text-gray-400'} />
              </button>
               <button
                onClick={() => navAction('ticket')} 
                className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-base font-semibold transition ${currentPage === 'ticket' ? 'bg-blue-900 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-navy-800'}`}>
                <span>Lacak Tiket</span>
                <ChevronRight size={16} className={currentPage === 'ticket' ? 'text-white' : 'text-gray-400'} />
              </button>
              <button
                onClick={() => navAction('deepfake')} 
                className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-base font-semibold transition ${currentPage === 'deepfake' ? 'bg-blue-900 text-white' : 'text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-navy-800'}`}>
                <span className="flex items-center gap-2"><ScanFace size={18}/> Cek Media AI</span>
                <ChevronRight size={16} className={currentPage === 'deepfake' ? 'text-white' : 'text-gray-400'} />
              </button>
              <button 
                onClick={() => navAction('report')}
                className={`flex items-center justify-between w-full px-3 py-3 rounded-xl text-base font-semibold transition ${currentPage === 'report' ? 'bg-blue-900 text-white' : 'text-blue-900 dark:text-white bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100'}`}
              >
                <span className="flex items-center gap-2"><FileText size={18}/> Lapor Hoax</span>
                <ChevronRight size={16} className={currentPage === 'report' ? 'text-white' : ''} />
              </button>

              {/* Divider */}
              <div className="h-px bg-gray-100 dark:bg-navy-800 my-2"></div>

              {/* Mobile Theme Toggle (Proportional & Cantik) */}
              <div 
                onClick={handleThemeToggle}
                className="flex items-center justify-between w-full px-4 py-3.5 rounded-xl bg-gray-50 dark:bg-navy-800 border border-gray-200 dark:border-navy-700 cursor-pointer active:scale-95 transition select-none"
              >
                 <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-full ${isDarkMode ? 'bg-blue-900/50 text-blue-300' : 'bg-yellow-100 text-yellow-600'}`}>
                        {isDarkMode ? <Moon size={18} /> : <Sun size={18} />}
                    </div>
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                        {isDarkMode ? 'Mode Gelap' : 'Mode Terang'}
                    </span>
                 </div>

                 {/* Custom Switch UI */}
                 <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-blue-600' : 'bg-gray-300'}`}>
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                 </div>
              </div>

            </div>
          </div>
        )}
      </nav>
    </>
  );
};

export default Navbar;