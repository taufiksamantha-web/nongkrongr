
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoginForm from '../components/admin/LoginForm';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserDashboard from '../components/admin/UserDashboard';
import { ThemeContext } from '../App';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import FloatingNotification from '../components/common/FloatingNotification';

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const AdminPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const navigate = useNavigate();

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const { error } = await logout();
        if (error) {
            console.error('Logout error:', error.message);
            setNotification({ message: `Gagal logout: ${error.message}. Coba lagi.`, type: 'error'});
            setIsLoggingOut(false);
        } else {
            // Logout berhasil, listener di AuthContext akan menghapus state user.
            // Cukup arahkan pengguna ke halaman utama.
            navigate('/');
        }
    };
    
    if (!currentUser) {
        return <LoginForm />;
    }

    return (
        <div className="container mx-auto px-6 py-8">
            {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h2 className="text-xl">Welcome, <span className="font-bold text-primary">{currentUser.username}</span></h2>
                    <p className="text-gray-500">You are logged in as: <span className="font-semibold">{currentUser.role.toUpperCase()}</span></p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleTheme} 
                        className="p-2 rounded-full text-muted bg-card hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300 border border-border"
                        aria-label="Toggle theme"
                    >
                        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="flex items-center justify-center gap-2 bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-all disabled:opacity-75"
                        disabled={isLoggingOut}
                    >
                        {isLoggingOut && <LoadingSpinner />}
                        {isLoggingOut ? 'Logging out...' : 'Logout'}
                    </button>
                </div>
            </div>
            
            {currentUser.role === 'admin' ? <AdminDashboard /> : <UserDashboard />}
        </div>
    );
};

export default AdminPage;
