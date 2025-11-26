
import React from 'react';
import { 
    HomeIcon, 
    ChartBarSquareIcon, 
    BuildingStorefrontIcon, 
    UserGroupIcon, 
    ChatBubbleLeftRightIcon, 
    InboxArrowDownIcon, 
    ArchiveBoxIcon, 
    Cog6ToothIcon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    CheckBadgeIcon
} from '@heroicons/react/24/outline';
import { User } from '../../types';

interface AdminSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activeView: string;
    setActiveView: (view: string) => void;
    user: User;
    onLogout: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose, activeView, setActiveView, user, onLogout }) => {
    
    const menuItems = [
        {
            category: "Utama",
            roles: ['admin', 'admin_cafe', 'user'],
            items: [
                { id: 'overview', label: 'Dashboard', icon: <ChartBarSquareIcon className="h-5 w-5" /> },
            ]
        },
        {
            category: "Persetujuan",
            roles: ['admin'],
            items: [
                { id: 'approval', label: 'Pusat Persetujuan', icon: <CheckBadgeIcon className="h-5 w-5" /> },
            ]
        },
        {
            category: "Manajemen Data",
            roles: ['admin'],
            items: [
                { id: 'cafes', label: 'Daftar Kafe', icon: <BuildingStorefrontIcon className="h-5 w-5" /> },
                { id: 'reviews', label: 'Review & Ulasan', icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> },
                { id: 'users', label: 'Pengguna', icon: <UserGroupIcon className="h-5 w-5" /> },
            ]
        },
        {
            category: "Kafe Saya",
            roles: ['admin_cafe'],
            items: [
                { id: 'my-cafes', label: 'Kelola Kafe', icon: <BuildingStorefrontIcon className="h-5 w-5" /> },
            ]
        },
        {
            category: "Aktivitas Saya",
            roles: ['user'],
            items: [
                { id: 'favorites', label: 'Favorit Saya', icon: <BuildingStorefrontIcon className="h-5 w-5" /> },
                { id: 'my-reviews', label: 'Review Saya', icon: <ChatBubbleLeftRightIcon className="h-5 w-5" /> },
            ]
        },
        {
            category: "Sistem",
            roles: ['admin'],
            items: [
                { id: 'feedback', label: 'Feedback Masuk', icon: <InboxArrowDownIcon className="h-5 w-5" /> },
                { id: 'archive', label: 'Arsip Data', icon: <ArchiveBoxIcon className="h-5 w-5" /> },
                { id: 'settings', label: 'Pengaturan Web', icon: <Cog6ToothIcon className="h-5 w-5" /> },
            ]
        }
    ];

    const filteredMenu = menuItems.map(group => ({
        ...group,
        items: group.items // Filter items could be added here if needed per item role
    })).filter(group => group.roles.includes(user.role));

    return (
        <>
            {/* Mobile Overlay */}
            <div 
                className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <aside 
                className={`
                    fixed top-0 left-0 z-50 h-screen w-64 bg-card dark:bg-gray-900 border-r border-border shadow-xl transform transition-transform duration-300 ease-in-out
                    lg:translate-x-0 lg:static lg:shadow-none flex flex-col
                    ${isOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {/* Header Logo */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-border">
                    <div className="flex items-center gap-2">
                        <img src="https://res.cloudinary.com/dovouihq8/image/upload/web-icon.png" alt="Logo" className="h-8 w-8" />
                        <span className="font-bold font-jakarta text-lg tracking-tight">Admin<span className="text-brand">Panel</span></span>
                    </div>
                    <button onClick={onClose} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800">
                        <XMarkIcon className="h-6 w-6 text-muted" />
                    </button>
                </div>

                {/* Menu Scroll Area */}
                <div className="flex-1 overflow-y-auto py-4 px-3 space-y-6 custom-scrollbar">
                    {filteredMenu.map((group, index) => (
                        <div key={index}>
                            <h3 className="px-3 text-xs font-bold text-muted uppercase tracking-wider mb-2">{group.category}</h3>
                            <ul className="space-y-1">
                                {group.items.map(item => (
                                    <li key={item.id}>
                                        <button
                                            onClick={() => { setActiveView(item.id); onClose(); }}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                                                ${activeView === item.id 
                                                    ? 'bg-brand text-white shadow-md shadow-brand/20' 
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-primary dark:hover:text-gray-200'
                                                }
                                            `}
                                        >
                                            {item.icon}
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Footer / Logout */}
                <div className="p-4 border-t border-border bg-soft/50 dark:bg-gray-800/50">
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <img 
                            src={user.avatar_url || `https://ui-avatars.com/api/?name=${user.username}&background=random`} 
                            alt="Profile" 
                            className="h-9 w-9 rounded-full object-cover border border-border"
                        />
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-primary dark:text-white truncate">{user.username}</p>
                            <p className="text-xs text-muted truncate capitalize">{user.role.replace('_', ' ')}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-bold"
                    >
                        <ArrowRightOnRectangleIcon className="h-4 w-4" />
                        Keluar
                    </button>
                </div>
            </aside>
        </>
    );
};

export default AdminSidebar;
