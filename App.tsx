import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, Link, NavLink } from 'react-router-dom';
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import DetailPage from './pages/DetailPage';
import AdminPage from './pages/AdminPage';
import WelcomeModal from './components/WelcomeModal';
import Footer from './components/Footer';
import { CafeProvider } from './context/CafeContext';
import { AuthProvider } from './context/AuthContext';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  toggleTheme: () => {},
});

const Header: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const activeLinkClass = "bg-primary text-white";
  const inactiveLinkClass = "hover:bg-primary/10 dark:hover:bg-primary/20";
  const linkClass = "px-4 py-2 rounded-2xl font-bold transition-all duration-300";

  return (
    <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-50 shadow-md dark:bg-gray-800/80 dark:shadow-none dark:border-b dark:border-gray-700">
      <nav className="container mx-auto px-4 py-2 flex flex-col md:flex-row md:justify-between md:items-center">
        <Link to="/" className="flex items-center justify-center md:justify-start py-2">
          <img src="https://res.cloudinary.com/dovouihq8/image/upload/c_scale,w_200,f_auto,q_auto/logo.png" alt="Nongkrongr Logo" className="h-10 w-auto" />
        </Link>
        <div className="flex items-center justify-center space-x-2 md:space-x-4 mt-2 md:mt-0">
          <NavLink to="/" className={({ isActive }) => `hidden md:block ${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Home</NavLink>
          <NavLink to="/explore" className={({ isActive }) => `${linkClass} ${isActive ? activeLinkClass : inactiveLinkClass}`}>Explore</NavLink>
          <button 
            onClick={toggleTheme} 
            className="p-2 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
          </button>
        </div>
      </nav>
    </header>
  );
};


const App: React.FC = () => {
  const [showWelcome, setShowWelcome] = useState(true);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (storedTheme) {
        setTheme(storedTheme);
    } else {
        setTheme(prefersDark ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <AuthProvider>
        <CafeProvider>
          <div className="bg-gray-50 min-h-screen font-sans text-gray-800 dark:bg-gray-900 dark:text-gray-200 flex flex-col">
          {showWelcome && <WelcomeModal onClose={() => setShowWelcome(false)} />}
          <HashRouter>
              <Header />
              <main className="flex-grow">
              <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/cafe/:slug" element={<DetailPage />} />
                  <Route path="/admin" element={<AdminPage />} />
              </Routes>
              </main>
              <Footer />
          </HashRouter>
          </div>
        </CafeProvider>
      </AuthProvider>
    </ThemeContext.Provider>
  );
};

export default App;