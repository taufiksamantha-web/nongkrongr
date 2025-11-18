

import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserDashboard from '../components/admin/UserDashboard';
import AdminCafeDashboard from '../components/admin/AdminCafeDashboard';
import FloatingNotification from '../components/common/FloatingNotification';
import ConfirmationModal from '../components/common/ConfirmationModal';
import { ThemeContext } from '../App';
import { SunIcon, MoonIcon, InformationCircleIcon, HomeIcon } from '@heroicons/react/24/solid';

const LoadingSpinner: React.FC = () => (
    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const PendingApprovalScreen: React.FC = () => (
    <div className="bg-card p-8 rounded-3xl shadow-sm border border-border text-center mt-8 animate-fade-in-up">
        <InformationCircleIcon className="h-16 w-16 mx-auto text-brand mb-4" />
        <h1 className="text-3xl font-bold font-jakarta mb-2">Akun Anda Sedang Ditinjau</h1>
        <p className="text-muted max-w-md mx-auto">
            Terima kasih telah mendaftar sebagai Pengelola Kafe. Akun Anda akan aktif setelah disetujui oleh Administrator.
            Silakan cek kembali nanti.
        </p>
    </div>
);

const AdminPage: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const handleLogout = async () => {
        setIsLoggingOut(true);
        const { error } = await logout();
        if (error) {
            console.error('Logout error:', error.message);
            setNotification({ message: `Gagal menyelesaikan logout di server: ${error.message}.`, type: 'error'});
            setIsLoggingOut(false);
        }
    };
    
    if (!currentUser) {
        return null;
    }

    const renderDashboardByRole = () => {
        switch (currentUser.role) {
            case 'admin':
                return <AdminDashboard />;
            case 'admin_cafe':
                return <AdminCafeDashboard />;
            case 'user':
                return <UserDashboard />;
            default:
                return <UserDashboard />;
        }
    };

    return (
        <div className="bg-soft min-h-screen text-primary dark:text-gray-200">
            {isLogoutModalOpen && (
                <ConfirmationModal
                    title="Konfirmasi Logout"
                    message="Apakah Anda yakin ingin keluar dari sesi ini?"
                    confirmText="Ya, Logout"
                    cancelText="Batal"
                    onConfirm={handleLogout}
                    onCancel={() => setIsLogoutModalOpen(false)}
                    isConfirming={isLoggingOut}
                />
            )}
            <div className="container mx-auto px-6 py-8">
                {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
                <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl">Welcome, <span className="font-bold text-primary">{currentUser.username}</span></h2>
                        <p className="text-gray-500">You are logged in as: <span className="font-semibold">{currentUser.role.toUpperCase().replace('_', ' ')}</span></p>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Link 
                            to="/" 
                            className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
                            aria-label="Home"
                            title="Kembali ke Home"
                        >
                            <HomeIcon className="h-6 w-6" />
                        </Link>
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-300"
                            aria-label="Toggle theme"
                          >
                            {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6 text-yellow-400" />}
                        </button>
                        <button 
                            onClick={() => setIsLogoutModalOpen(true)} 
                            className="flex items-center justify-center bg-accent-pink text-white font-bold py-2 px-6 rounded-2xl hover:bg-accent-pink/90 transition-all"
                        >
                            Logout
                        </button>
                    </div>
                </div>
                
                {currentUser.status === 'pending_approval' ? <PendingApprovalScreen /> : renderDashboardByRole()}

            </div>
        </div>
    );
};

export default AdminPage;