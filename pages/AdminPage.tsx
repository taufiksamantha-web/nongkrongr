
import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AdminDashboard from '../components/admin/AdminDashboard';
import UserDashboard from '../components/admin/UserDashboard';
import AdminCafeDashboard from '../components/admin/AdminCafeDashboard';
import FloatingNotification from '../components/common/FloatingNotification';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ProfileUpdateModal from '../components/admin/ProfileUpdateModal';
import { ThemeContext } from '../App';
import { SunIcon, MoonIcon, InformationCircleIcon, HomeIcon, ArrowRightOnRectangleIcon, PencilSquareIcon } from '@heroicons/react/24/solid';

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
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

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
        <div className="bg-soft min-h-screen text-primary dark:text-gray-200 pb-12">
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

            {isProfileModalOpen && (
                <ProfileUpdateModal 
                    onClose={() => setIsProfileModalOpen(false)} 
                    setNotification={setNotification}
                />
            )}
            
            <div className="container mx-auto px-4 pt-4">
                {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
                
                {/* Optimized Navigation Header */}
                <header className="bg-card/80 dark:bg-gray-800/80 backdrop-blur-md border border-border rounded-3xl p-3 sm:p-4 mb-8 flex items-center justify-between sticky top-4 z-30 shadow-sm">
                    <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-3 px-2 group hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all py-1 cursor-pointer relative"
                        title="Klik untuk ganti foto profil"
                    >
                        <div className="relative">
                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" className="h-10 w-10 rounded-full object-cover border-2 border-brand/30 group-hover:border-brand transition-colors" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold border-2 border-brand/30 group-hover:border-brand transition-colors">
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border opacity-0 group-hover:opacity-100 transition-opacity">
                                <PencilSquareIcon className="h-3 w-3 text-brand" />
                            </div>
                        </div>
                        <div className="hidden sm:block text-left">
                            <h2 className="text-sm font-bold font-jakarta text-primary dark:text-white leading-tight group-hover:text-brand transition-colors">
                                {currentUser.username}
                            </h2>
                            <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                                {(currentUser.role || '').replace('_', ' ')}
                            </p>
                        </div>
                    </button>

                    <div className="flex items-center bg-gray-100 dark:bg-gray-700/50 rounded-full p-1.5 border border-gray-200 dark:border-gray-600">
                         <Link 
                            to="/" 
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-muted hover:text-primary hover:bg-white dark:hover:bg-gray-600 transition-all" 
                            title="Ke Halaman Utama"
                        >
                            <HomeIcon className="h-5 w-5"/>
                            <span className="hidden md:inline">Home</span>
                        </Link>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full text-muted hover:text-yellow-500 hover:bg-white dark:hover:bg-gray-600 transition-all"
                            aria-label="Toggle theme"
                        >
                            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                        </button>
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 mx-1"></div>
                        <button 
                            onClick={() => setIsLogoutModalOpen(true)} 
                            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all"
                            title="Logout"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="hidden md:inline">Keluar</span>
                        </button>
                    </div>
                </header>
                
                <div className="px-2">
                    {currentUser.status === 'pending_approval' ? <PendingApprovalScreen /> : renderDashboardByRole()}
                </div>
            </div>
        </div>
    );
};

export default AdminPage;
