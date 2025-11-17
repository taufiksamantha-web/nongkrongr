import React from 'react';
import { Link } from 'react-router-dom';

const InstagramIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" strokeLinecap="round"></line>
  </svg>
);
const TikTokIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.03-4.83-1-6.72-2.91-1.89-1.91-2.97-4.66-2.98-7.39.01-2.52 1.03-5.03 2.9-6.9.01-.01.01-.01.02-.01.33-.32.68-.63 1.06-.91.04-.03.07-.06.11-.09 1.08-1.01 2.5-1.72 3.99-1.94.32-.05.65-.08.98-.09zm3.84 4.01c-.12.02-.25.03-.38.04-1.3.04-2.6-.13-3.82-.63-.33-.14-.65-.3-.96-.47-.01 3.39.01 6.78-.02 10.16-.12 1.13-.53 2.22-1.21 3.14-1.06 1.44-2.82 2.31-4.63 2.37-1.84.06-3.6-1.04-4.52-2.73-.55-1.02-.8-2.2-.8-3.41.01-1.46.33-2.91 1.01-4.2.59-1.11 1.45-2.06 2.53-2.72.6-.37 1.25-.66 1.92-.86.33-.1.66-.19 1-.27.02-1.2.01-2.4-.01-3.6-.28.08-.56.18-.83.29-1.2.51-2.33 1.25-3.32 2.15-1.89 1.66-3.26 4.09-3.28 6.75-.02 2.57 1.02 5.12 2.93 6.98 1.91 1.86 4.6 2.96 7.25 2.95 2.65-.01 5.18-1.13 6.94-3.07 1.06-1.16 1.77-2.61 1.95-4.12.11-1.02.1-2.06.11-3.09v-5.18c-1.15.35-2.32.54-3.5.59z" />
    </svg>
);
const TwitterIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616v.064c0 2.298 1.633 4.215 3.792 4.654-.562.152-1.158.23-1.77.23-.303 0-.596-.03-.884-.083.608 1.883 2.372 3.256 4.465 3.294-1.623 1.27-3.666 2.028-5.883 2.028-.382 0-.759-.022-1.129-.066 2.099 1.353 4.605 2.146 7.299 2.146 8.749 0 13.529-7.249 13.529-13.529 0-.206-.005-.412-.013-.617.93-.672 1.731-1.511 2.368-2.454z" />
    </svg>
);


const Footer: React.FC = () => {
    return (
        <footer className="bg-card border-t border-border mt-16">
            <div className="container mx-auto px-6 py-12">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 text-center lg:text-left">
                    {/* Branding & About */}
                    <div className="col-span-1 lg:col-span-2">
                        <Link to="/" className="inline-block mb-2">
                           <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-8 lg:h-10 w-auto mx-auto lg:mx-0" />
                        </Link>
                        <p className="mt-2 text-muted max-w-sm mx-auto lg:mx-0">
                            Platform rekomendasi cafe aesthetic di Sumatera Selatan untuk Gen Z yang hobi nongkrong, hunting foto, dan nugas.
                        </p>
                    </div>
                    
                    {/* Quick Links */}
                    <div>
                        <h4 className="font-bold text-primary dark:text-gray-200 uppercase tracking-wider">Navigasi</h4>
                        <nav className="mt-4 space-y-2">
                            <Link to="/" className="block text-muted hover:text-brand dark:hover:text-white transition-colors">Home</Link>
                            <Link to="/explore" className="block text-muted hover:text-brand dark:hover:text-white transition-colors">Explore</Link>
                            <Link to="/leaderboard" className="block text-muted hover:text-brand dark:hover:text-white transition-colors">Leaderboard</Link>
                            <Link to="/about" className="block text-muted hover:text-brand dark:hover:text-white transition-colors">Tentang Kami</Link>
                        </nav>
                    </div>

                    {/* Social Media */}
                    <div>
                         <h4 className="font-bold text-primary dark:text-gray-200 uppercase tracking-wider">Follow Us</h4>
                         <div className="mt-4 flex space-x-4 justify-center lg:justify-start">
                            <a href="#" aria-label="Instagram" className="text-muted hover:text-[#E1306C] transition-colors"><InstagramIcon /></a>
                            <a href="#" aria-label="TikTok" className="text-muted hover:text-accent-cyan transition-colors"><TikTokIcon /></a>
                            <a href="#" aria-label="Twitter" className="text-muted hover:text-[#1DA1F2] transition-colors"><TwitterIcon /></a>
                         </div>
                    </div>
                </div>

                <div className="mt-12 border-t border-border pt-8 text-center text-muted text-sm">
                    <p>&copy; {new Date().getFullYear()} Nongkrongr. Dibuat dengan 💜 di Sumatera Selatan.</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;