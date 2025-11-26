
import React, { useState, useEffect, useContext, Suspense, lazy } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import FloatingNotification from '../components/common/FloatingNotification';
import ConfirmationModal from '../components/common/ConfirmationModal';
import ProfileUpdateModal from '../components/admin/ProfileUpdateModal';
import NotificationPanel from '../components/NotificationPanel';
import AdminSidebar from '../components/admin/AdminSidebar';
import { ThemeContext } from '../App';
import { SunIcon, MoonIcon, BellIcon, Bars3Icon } from '@heroicons/react/24/outline';

// Lazy Load Dashboard Components
const AdminDashboard = lazy(() => import('../components/admin/AdminDashboard'));
const UserDashboard = lazy(() => import('../components/admin/UserDashboard'));
const AdminCafeDashboard = lazy(() => import('../components/admin/AdminCafeDashboard'));

const DashboardSkeleton = () => (
    <div className="space-y-4 p-6 animate-pulse">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
            <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded-3xl"></div>
        </div>
        <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-3xl mt-8"></div>
    </div>
);

const PendingApprovalScreen: React.FC = () => (
    <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6 animate-pulse">
             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
            </svg>
        </div>
        <h1 className="text-3xl font-bold font-jakarta mb-3 text-primary dark:text-white">Akun Sedang Ditinjau</h1>
        <p className="text-muted max-w-md text-lg leading-relaxed">
            Terima kasih telah mendaftar. Akun Anda akan aktif setelah disetujui oleh Administrator. Silakan cek kembali nanti ya!
        </p>
    </div>
);

const AdminPage: React.FC = () => {
    const { currentUser, logout, isLoggingOut } = useAuth();
    const { theme, toggleTheme } = useContext(ThemeContext);
    const { unreadCount } = useNotifications();
    
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeView, setActiveView] = useState('overview');
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    
    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (!currentUser) return;
        const path = location.pathname;
        let correctPath = '/dashboard-profile';
        if (currentUser.role === 'admin') correctPath = '/dashboard-admin';
        if (currentUser.role === 'admin_cafe') correctPath = '/dashboard-pengelola';
        
        if (path !== correctPath) {
            navigate(correctPath, { replace: true });
        }
    }, [currentUser, location.pathname, navigate]);

    const handleLogout = async () => {
        setIsLogoutModalOpen(false);
        const { error } = await logout();
        if (error) {
            setNotification({ message: `Gagal logout: ${error.message}`, type: 'error' });
        } else {
            navigate('/', { replace: true });
        }
    };

    if (!currentUser) return null;

    const getTitle = () => {
        if (activeView === 'overview') return 'Dashboard Overview';
        if (activeView === 'approval') return 'Pusat Persetujuan';
        if (activeView === 'cafes' || activeView === 'my-cafes') return 'Manajemen Kafe';
        if (activeView === 'reviews' || activeView === 'my-reviews') return 'Ulasan & Review';
        if (activeView === 'users') return 'Manajemen Pengguna';
        if (activeView === 'feedback') return 'Saran & Masukan';
        if (activeView === 'archive') return 'Arsip Data';
        if (activeView === 'settings') return 'Pengaturan Website';
        if (activeView === 'favorites') return 'Favorit Saya';
        return 'Dashboard';
    };

    return (
        <div className="flex h-screen bg-soft overflow-hidden">
            {isLogoutModalOpen && (
                <ConfirmationModal
                    title="Konfirmasi Logout"
                    message="Yakin ingin keluar sesi?"
                    confirmText="Logout"
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

            {/* Sidebar */}
            <AdminSidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                activeView={activeView}
                setActiveView={setActiveView}
                user={currentUser}
                onLogout={() => setIsLogoutModalOpen(true)}
            />

            {/* Main Layout */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-16 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 lg:hidden transition-colors"
                        >
                            <Bars3Icon className="h-6 w-6 text-primary dark:text-white" />
                        </button>
                        <h1 className="text-lg lg:text-xl font-bold font-jakarta text-primary dark:text-white truncate">
                            {getTitle()}
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 lg:gap-4">
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-full text-muted hover:text-brand hover:bg-brand/5 transition-all"
                            title="Ganti Tema"
                        >
                            {theme === 'light' ? <MoonIcon className="h-5 w-5" /> : <SunIcon className="h-5 w-5" />}
                        </button>

                        <div className="relative">
                            <button 
                                onClick={() => setIsNotifOpen(!isNotifOpen)}
                                className="p-2 rounded-full text-muted hover:text-brand hover:bg-brand/5 transition-all relative"
                            >
                                <BellIcon className="h-5 w-5" />
                                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-900"></span>}
                            </button>
                            <NotificationPanel isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} origin="top" />
                        </div>
                        
                        <div className="hidden sm:block h-6 w-px bg-border mx-2"></div>
                        
                        <button 
                            onClick={() => setIsProfileModalOpen(true)}
                            className="hidden sm:flex items-center gap-2 hover:bg-gray-100 dark:hover:bg-gray-800 py-1.5 px-2 rounded-lg transition-colors"
                        >
                            <img 
                                src={currentUser.avatar_url || `https://ui-avatars.com/api/?name=${currentUser.username}&background=random`} 
                                alt="Avatar" 
                                className="h-7 w-7 rounded-full object-cover border border-border"
                            />
                            <span className="text-sm font-semibold max-w-[100px] truncate">{currentUser.username}</span>
                        </button>
                    </div>
                </header>

                {/* Main Content Area - Scrollable */}
                <main className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
                    {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
                    
                    {currentUser.status === 'pending_approval' ? (
                        <PendingApprovalScreen />
                    ) : (
                        <Suspense fallback={<DashboardSkeleton />}>
                            <div className="max-w-7xl mx-auto animate-fade-in-up">
                                {currentUser.role === 'admin' && <AdminDashboard activeView={activeView} />}
                                {currentUser.role === 'admin_cafe' && <AdminCafeDashboard activeView={activeView} />}
                                {currentUser.role === 'user' && <UserDashboard activeView={activeView} />}
                            </div>
                        </Suspense>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminPage;
