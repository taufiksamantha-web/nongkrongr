
import React, { useState, useEffect, useContext, useRef, Suspense, lazy } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import FloatingNotification from '../common/FloatingNotification';
import ConfirmationModal from '../common/ConfirmationModal';
import ProfileUpdateModal from './ProfileUpdateModal';
import NotificationPanel from '../NotificationPanel';
import { ThemeContext } from '../../App';
import { ArrowRightOnRectangleIcon, PencilSquareIcon, HomeIcon, SunIcon, MoonIcon, BellIcon } from '@heroicons/react/24/solid';

// Lazy Load Dashboard Components to optimize initial bundle
const AdminDashboard = lazy(() => import('./AdminDashboard'));
const UserDashboard = lazy(() => import('./UserDashboard'));
const AdminCafeDashboard = lazy(() => import('./AdminCafeDashboard'));

// Fallback for lazy loaded dashboards
const DashboardSkeleton = () => (
    <div className="space-y-4 p-4 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-2xl"></div>
        </div>
        <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-3xl mt-6"></div>
    </div>
);

const PendingApprovalScreen: React.FC = () => (
    <div className="bg-card p-8 rounded-3xl shadow-sm border border-border text-center mt-8 animate-fade-in-up">
        <div className="mx-auto w-16 h-16 bg-brand/10 rounded-full flex items-center justify-center mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-brand">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        </div>
        <h1 className="text-3xl font-bold font-jakarta mb-2">Akun Anda Sedang Ditinjau</h1>
        <p className="text-muted max-w-md mx-auto">
            Terima kasih telah mendaftar sebagai Pengelola Kafe. Akun Anda akan aktif setelah disetujui oleh Administrator.
            Silakan cek kembali nanti.
        </p>
    </div>
);

const AdminMobileDock: React.FC<{ 
    user: any, 
    onLogout: () => void, 
    onProfileClick: () => void,
    toggleTheme: () => void,
    theme: string
}> = ({ user, onLogout, onProfileClick, toggleTheme, theme }) => {
    const { unreadCount } = useNotifications();
    const [showNotif, setShowNotif] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setShowNotif(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => document.removeEventListener("click", handleClickOutside);
    }, []);

    return (
        <div className="fixed bottom-6 left-0 right-0 z-[100] lg:hidden flex justify-center px-4 pointer-events-none">
            {/* Notification Panel - Centered on Screen via bottom-center logic */}
            <NotificationPanel isOpen={showNotif} onClose={() => setShowNotif(false)} origin="bottom-center" />

            <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-2xl shadow-brand/10 rounded-full px-2 h-16 flex items-center justify-around gap-2 pointer-events-auto w-full max-w-[340px] transition-all duration-300 ring-1 ring-black/5 dark:ring-white/5">
                
                {/* Left Group: Home & Theme */}
                <div className="flex items-center gap-1">
                    <Link to="/" className="p-2.5 rounded-full text-muted hover:text-brand hover:bg-brand/10 transition-all active:scale-90 flex flex-col items-center justify-center">
                        <HomeIcon className="h-6 w-6" />
                    </Link>
                    <button onClick={toggleTheme} className="p-2.5 rounded-full text-muted hover:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-gray-700 transition-all active:scale-90 flex flex-col items-center justify-center">
                        {theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}
                    </button>
                </div>

                {/* Center Profile (Elevated & Highlighted) */}
                <div className="relative -top-6 flex-shrink-0">
                    <button 
                        onClick={onProfileClick}
                        className="w-16 h-16 rounded-full p-1 bg-white dark:bg-gray-800 shadow-lg shadow-brand/20 border-4 border-white dark:border-gray-900 hover:scale-105 transition-transform overflow-hidden relative group active:scale-95 flex items-center justify-center ring-1 ring-brand/20"
                    >
                        {user.avatar_url ? (
                            <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
                        ) : (
                            <div className="w-full h-full bg-brand text-white flex items-center justify-center rounded-full text-xl font-bold">
                                {user.username.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-full backdrop-blur-[1px]">
                            <PencilSquareIcon className="h-6 w-6 text-white" />
                        </div>
                    </button>
                </div>

                {/* Right Group: Notif & Logout */}
                <div className="flex items-center gap-1">
                    <div className="relative" ref={notifRef}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowNotif(!showNotif); }} 
                            className={`p-2.5 rounded-full transition-all active:scale-90 flex flex-col items-center justify-center ${showNotif ? 'text-brand bg-brand/10' : 'text-muted hover:text-brand hover:bg-brand/10'}`}
                        >
                            <BellIcon className="h-6 w-6" />
                            {unreadCount > 0 && <span className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></span>}
                        </button>
                    </div>
                    <button onClick={onLogout} className="p-2.5 rounded-full text-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all active:scale-90 flex flex-col items-center justify-center">
                        <ArrowRightOnRectangleIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>
        </div>
    );
};

const AdminPage: React.FC = () => {
    const { currentUser, logout, isLoggingOut } = useAuth();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    const location = useLocation();
    const navigate = useNavigate();

    // Enforce correct URL for role
    useEffect(() => {
        if (!currentUser) return;

        const path = location.pathname;
        const role = currentUser.role;
        
        let correctPath = '/dashboard-profile';
        if (role === 'admin') correctPath = '/dashboard-admin';
        if (role === 'admin_cafe') correctPath = '/dashboard-pengelola';
        
        if (path !== correctPath) {
            navigate(correctPath, { replace: true });
        }
    }, [currentUser, location.pathname, navigate]);

    const handleLogout = async () => {
        setIsLogoutModalOpen(false);
        const { error } = await logout();
        if (error) {
            console.error('Logout error:', error.message);
            setNotification({ message: `Gagal menyelesaikan logout di server: ${error.message}.`, type: 'error' });
        } else {
            // Force redirect to Homepage immediately
            navigate('/', { replace: true });
        }
    };

    if (!currentUser) {
        return null;
    }

    const renderDashboardByRole = () => {
        return (
            <Suspense fallback={<DashboardSkeleton />}>
                {(() => {
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
                })()}
            </Suspense>
        );
    };

    return (
        <div className="bg-soft min-h-screen text-primary dark:text-gray-200 pb-32">
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
            
            <div className="container mx-auto px-4 pt-safe-top max-w-6xl">
                {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
                
                {/* Dashboard Header - Desktop Only - Sticky & Floating */}
                <header className="hidden md:flex sticky top-4 z-40 bg-card/80 dark:bg-gray-800/80 backdrop-blur-md border border-border rounded-3xl p-3 px-4 mb-8 items-center justify-between shadow-sm transition-all duration-300 min-h-[72px]">
                    
                    {/* Profile Section (Left) */}
                    <button 
                        onClick={() => setIsProfileModalOpen(true)}
                        className="flex items-center gap-3 px-2 group hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded-xl transition-all py-1.5 cursor-pointer relative z-10"
                        title="Ganti foto profil"
                    >
                        <div className="relative">
                            {currentUser.avatar_url ? (
                                <img src={currentUser.avatar_url} alt="Profile" className="h-10 w-10 rounded-full object-cover border-2 border-brand/30 group-hover:border-brand transition-colors" />
                            ) : (
                                <div className="h-10 w-10 rounded-full bg-brand/10 flex items-center justify-center text-brand font-bold border-2 border-brand/30 group-hover:border-brand transition-colors text-base">
                                    {currentUser.username.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div className="absolute -bottom-1 -right-1 bg-card rounded-full p-0.5 border border-border opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                                <PencilSquareIcon className="h-3 w-3 text-brand" />
                            </div>
                        </div>
                        <div className="text-left">
                            <h2 className="text-base font-bold font-jakarta text-primary dark:text-white leading-tight group-hover:text-brand transition-colors">
                                {currentUser.username}
                            </h2>
                            <p className="text-xs text-muted font-semibold uppercase tracking-wider">
                                {(currentUser.role || '').replace('_', ' ')}
                            </p>
                        </div>
                    </button>

                    {/* Actions Section (Right): Home, Theme, Logout */}
                    <div className="flex items-center gap-2">
                        <Link 
                            to="/" 
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-muted hover:text-brand hover:bg-brand/10 transition-all"
                            title="Ke Homepage"
                        >
                            <HomeIcon className="h-5 w-5" />
                        </Link>
                        
                        <button 
                            onClick={toggleTheme} 
                            className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-700 text-muted hover:text-yellow-500 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 transition-all"
                            title={theme === 'light' ? 'Mode Gelap' : 'Mode Terang'}
                        >
                            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                        </button>

                        <div className="h-6 w-px bg-border mx-1"></div>

                        <button 
                            onClick={() => setIsLogoutModalOpen(true)} 
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-full text-sm font-bold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all"
                            title="Logout"
                        >
                            <ArrowRightOnRectangleIcon className="h-5 w-5" />
                            <span className="hidden lg:inline">Keluar</span>
                        </button>
                    </div>
                </header>
                
                <div className="px-2">
                    {currentUser.status === 'pending_approval' ? <PendingApprovalScreen /> : renderDashboardByRole()}
                </div>
            </div>

            {/* Mobile Dashboard Dock */}
            <AdminMobileDock 
                user={currentUser}
                onLogout={() => setIsLogoutModalOpen(true)}
                onProfileClick={() => setIsProfileModalOpen(true)}
                toggleTheme={toggleTheme}
                theme={theme}
            />
        </div>
    );
};

export default AdminPage;
