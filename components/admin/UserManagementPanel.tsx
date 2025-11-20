
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import UserFormModal from './UserFormModal';
import FloatingNotification from '../common/FloatingNotification';
import ConfirmationModal from '../common/ConfirmationModal';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon, PencilIcon, TrashIcon, UserCircleIcon, BuildingStorefrontIcon, ArchiveBoxArrowDownIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 10;
type RoleTab = 'admin' | 'admin_cafe' | 'user';

const UserManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    
    const [userToArchive, setUserToArchive] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<RoleTab>('admin_cafe');

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*').neq('status', 'archived').order('username', { ascending: true });
        if (error) {
            console.error("Error fetching users:", error);
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } else {
            setUsers(data as User[]);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchUsers();
    }, []);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, activeTab]);

    const filteredUsers = useMemo(() => {
        return users
            .filter(user => {
                // Filter by Role Tab
                if (user.role !== activeTab) return false;

                // PENTING: Untuk Pengelola Cafe (admin_cafe), hanya tampilkan yang statusnya 'active'.
                // Status 'pending_approval' atau 'rejected' dikelola di ApprovalHub, bukan di sini.
                if (activeTab === 'admin_cafe' && user.status !== 'active') {
                    return false;
                }

                return true;
            })
            .filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery, activeTab]);

    const totalItems = filteredUsers.length;
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const counts = useMemo(() => ({
        admin_cafe: users.filter(u => u.role === 'admin_cafe' && u.status === 'active').length, // Count active only
        user: users.filter(u => u.role === 'user').length,
        admin: users.filter(u => u.role === 'admin').length,
    }), [users]);
    
    const handleSaveUser = async (userData: Partial<User>) => {
        if (!editingUser) {
             setNotification({ message: 'Error: No user selected for editing.', type: 'error' });
             setIsUserFormOpen(false);
             return;
        }

        const oldUsers = [...users];
        setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, ...userData } as User : u));

        const { error } = await supabase
            .from('profiles')
            .update({ username: userData.username, role: userData.role })
            .eq('id', editingUser.id);

        if (error) {
            setUsers(oldUsers);
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'Profil user berhasil diperbarui!', type: 'success' });
        }
        setIsUserFormOpen(false);
        setEditingUser(null);
    };

    const handleArchiveUser = async () => {
        if (!userToArchive || userToArchive.id === currentUser?.id) {
            setNotification({ message: 'Tidak dapat mengarsipkan diri sendiri.', type: 'error' });
            setUserToArchive(null);
            return;
        }
        setIsProcessing(true);
        
        const { error } = await userService.archiveUser(userToArchive.id);
        
        if (error) {
            setNotification({ message: `Gagal mengarsipkan profil: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Profil "${userToArchive.username}" telah diarsipkan.`, type: 'success' });
            setUsers(prev => prev.filter(u => u.id !== userToArchive.id));
            if (paginatedUsers.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        }
        setUserToArchive(null);
        setIsProcessing(false);
    };
    
    const handlePermanentDelete = async () => {
        if (!userToDelete || userToDelete.id === currentUser?.id) {
             setNotification({ message: 'Tidak dapat menghapus diri sendiri.', type: 'error' });
             setUserToDelete(null);
             return;
        }
        setIsProcessing(true);

        const { error } = await userService.deleteUserPermanent(userToDelete.id);
        
        if (error) {
             setNotification({ message: `Gagal menghapus permanen: ${error.message}`, type: 'error' });
        } else {
             setNotification({ message: `User "${userToDelete.username}" telah dihapus selamanya.`, type: 'success' });
             setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
             if (paginatedUsers.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        }
        setUserToDelete(null);
        setIsProcessing(false);
    };

    const handleOpenEditForm = (user: User) => {
        setEditingUser(user);
        setIsUserFormOpen(true);
    };

    const TabButton: React.FC<{ role: RoleTab, icon: React.ReactNode, label: string, count: number }> = ({ role, icon, label, count }) => (
        <button
            onClick={() => setActiveTab(role)}
            className={`flex items-center justify-center gap-2 w-full p-3 font-bold border-b-4 transition-colors ${
                activeTab === role 
                ? 'text-brand border-brand' 
                : 'text-muted border-transparent hover:bg-soft dark:hover:bg-gray-700/50'
            }`}
        >
            <div className="hidden sm:block">{icon}</div>
            <span className="text-xs sm:text-base">{label}</span>
            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-[10px] sm:text-xs text-muted font-bold">{count}</span>
        </button>
    );
    
    return (
        <div className="w-full">
             {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            
            <h2 className="text-2xl sm:text-3xl font-extrabold font-jakarta text-center mb-4 bg-gradient-to-r from-brand to-purple-600 bg-clip-text text-transparent">
                Manajemen User
            </h2>

             <div className="flex border-b border-border mb-4 overflow-x-auto justify-center">
                <TabButton role="admin_cafe" icon={<BuildingStorefrontIcon className="h-5 w-5"/>} label="Pengelola (Aktif)" count={counts.admin_cafe} />
                <TabButton role="user" icon={<UserCircleIcon className="h-5 w-5"/>} label="User" count={counts.user} />
                <TabButton role="admin" icon={<PencilIcon className="h-5 w-5"/>} label="Admin" count={counts.admin} />
            </div>

            <div className="relative mb-4 w-full max-w-md mx-auto">
                <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Cari username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 pl-11 rounded-xl border border-border bg-soft dark:bg-gray-700/50 text-primary dark:text-white placeholder-muted focus:ring-2 focus:ring-brand transition-colors text-sm"
                />
            </div>

             {/* Desktop Table View (Horizontal Scroll Enabled) */}
             <div className="hidden md:block bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border mb-4 w-full overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider w-1/3">Username</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider w-1/3">Email</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider text-right w-1/3">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="text-center p-4 text-muted">Memuat user...</td></tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr><td colSpan={3} className="text-center p-10 text-muted">
                                <InboxIcon className="mx-auto h-10 w-10 mb-2" />
                                <span className="font-semibold">User tidak ditemukan</span>
                            </td></tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user.id} className="border-b border-border last:border-0 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                                    <td className="p-4 font-semibold text-primary dark:text-gray-200 truncate max-w-[200px]" title={user.username}>{user.username}</td>
                                    <td className="p-4 text-muted text-sm truncate max-w-[250px]" title={user.email}>{user.email}</td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-2 justify-end">
                                            <button 
                                                onClick={() => handleOpenEditForm(user)} 
                                                className="p-2 text-brand bg-brand/10 rounded-full hover:bg-brand/20 transition-colors disabled:opacity-50"
                                                aria-label={`Edit user ${user.username}`}
                                                disabled={user.id === currentUser?.id}
                                                title="Edit User"
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button 
                                                onClick={() => setUserToArchive(user)} 
                                                className="p-2 text-amber-500 bg-amber-100 dark:bg-amber-500/20 rounded-full hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                                                disabled={user.id === currentUser?.id}
                                                aria-label={`Archive user ${user.username}`}
                                                title="Arsipkan User"
                                            >
                                                <ArchiveBoxArrowDownIcon className="h-5 w-5" />
                                            </button>
                                            {currentUser?.role === 'admin' && (
                                                <button 
                                                    onClick={() => setUserToDelete(user)} 
                                                    className="p-2 text-red-500 bg-red-100 dark:bg-red-500/20 rounded-full hover:bg-red-200 dark:hover:bg-red-500/30 transition-colors disabled:opacity-50"
                                                    disabled={user.id === currentUser?.id}
                                                    aria-label={`Delete user ${user.username}`}
                                                    title="Hapus Permanen"
                                                >
                                                    <TrashIcon className="h-5 w-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>

             {/* Mobile Card View (Full Width Stack) */}
             <div className="md:hidden space-y-3 mb-4">
                {loading ? (
                     <p className="text-center text-muted">Memuat user...</p>
                ) : paginatedUsers.length === 0 ? (
                     <div className="text-center p-10 bg-soft dark:bg-gray-700/50 rounded-xl border border-border">
                        <InboxIcon className="mx-auto h-10 w-10 text-muted mb-2" />
                        <span className="font-semibold text-muted">User tidak ditemukan</span>
                     </div>
                ) : (
                    paginatedUsers.map(user => (
                        <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 mr-2">
                                    <p className="font-bold text-lg text-primary dark:text-gray-200 truncate">{user.username}</p>
                                    <p className="text-sm text-muted truncate">{user.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-brand/10 dark:bg-brand/20 text-brand rounded-full uppercase">
                                        {(user.role || '').replace('_', ' ')}
                                    </span>
                                </div>
                            </div>
                             <div className="flex gap-2 pt-2 border-t border-border justify-end flex-wrap">
                                     <button 
                                        onClick={() => handleOpenEditForm(user)} 
                                        className="flex-1 p-2 bg-brand/10 text-brand rounded-lg border border-brand/20 disabled:opacity-50 flex items-center justify-center gap-1"
                                        disabled={user.id === currentUser?.id}
                                        aria-label="Edit"
                                    >
                                        <PencilIcon className="h-4 w-4" /> <span className="text-xs font-bold">Edit</span>
                                    </button>
                                    <button 
                                        onClick={() => setUserToArchive(user)} 
                                        className="flex-1 p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-lg border border-amber-200 disabled:opacity-50 flex items-center justify-center gap-1"
                                        disabled={user.id === currentUser?.id}
                                        aria-label="Archive"
                                    >
                                        <ArchiveBoxArrowDownIcon className="h-4 w-4" /> <span className="text-xs font-bold">Arsip</span>
                                    </button>
                                     {currentUser?.role === 'admin' && (
                                        <button 
                                            onClick={() => setUserToDelete(user)} 
                                            className="flex-1 p-2 bg-red-100 dark:bg-red-500/20 text-red-600 rounded-lg border border-red-200 disabled:opacity-50 flex items-center justify-center gap-1"
                                            disabled={user.id === currentUser?.id}
                                            aria-label="Delete"
                                        >
                                            <TrashIcon className="h-4 w-4" /> <span className="text-xs font-bold">Hapus</span>
                                        </button>
                                    )}
                                </div>
                        </div>
                    ))
                )}
             </div>

             {/* Pagination UI */}
             {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center mt-8 gap-4 w-full border-t border-border pt-6">
                    <p className="text-sm text-muted font-medium order-2 sm:order-1 text-center sm:text-left">
                        Menampilkan <span className="font-bold text-primary dark:text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-primary dark:text-white">{Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}</span> dari <span className="font-bold text-primary dark:text-white">{totalItems}</span> data
                    </p>
                    
                    <div className="flex items-center gap-2 order-1 sm:order-2 overflow-x-auto w-full sm:w-auto justify-center sm:justify-end pb-2 sm:pb-0">
                        <button 
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                            disabled={currentPage === 1} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-soft hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <ChevronLeftIcon className="h-5 w-5 text-muted" />
                        </button>
                        
                        {(() => {
                            const range = [];
                            const delta = 1;
                            const rangeWithDots = [];
                            let l;

                            range.push(1);
                            for (let i = currentPage - delta; i <= currentPage + delta; i++) {
                                if (i < totalPages && i > 1) {
                                    range.push(i);
                                }
                            }
                            if (totalPages > 1) range.push(totalPages);

                            for (let i of range) {
                                if (l) {
                                    if (i - l === 2) rangeWithDots.push(l + 1);
                                    else if (i - l !== 1) rangeWithDots.push('...');
                                }
                                rangeWithDots.push(i);
                                l = i;
                            }

                            return rangeWithDots.map((item, index) => (
                                <button
                                    key={index}
                                    onClick={() => typeof item === 'number' && setCurrentPage(item)}
                                    disabled={item === '...'}
                                    className={`w-10 h-10 flex items-center justify-center rounded-xl text-sm font-bold transition-all ${
                                        item === currentPage 
                                        ? 'bg-brand text-white shadow-lg shadow-brand/20 border border-brand transform scale-105' 
                                        : item === '...' 
                                            ? 'cursor-default text-muted' 
                                            : 'bg-soft hover:bg-brand/10 border border-border text-muted hover:text-brand dark:bg-gray-800 dark:hover:bg-gray-700'
                                    }`}
                                >
                                    {item}
                                </button>
                            ));
                        })()}

                        <button 
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                            disabled={currentPage === totalPages} 
                            className="w-10 h-10 flex items-center justify-center rounded-xl border border-border bg-soft hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                            <ChevronRightIcon className="h-5 w-5 text-muted" />
                        </button>
                    </div>
                </div>
            )}

             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
             
             {userToArchive && (
                <ConfirmationModal
                    title="Arsipkan User"
                    message={`Yakin ingin mengarsipkan profil "${userToArchive.username}"? User tidak akan bisa login, tapi data bisa dipulihkan nanti.`}
                    onConfirm={handleArchiveUser}
                    onCancel={() => setUserToArchive(null)}
                    isConfirming={isProcessing}
                    confirmText="Ya, Arsipkan"
                />
             )}
             {userToDelete && (
                <ConfirmationModal
                    title="Hapus Permanen User"
                    message={`PERINGATAN: Anda akan menghapus user "${userToDelete.username}" secara permanen beserta semua datanya. Tindakan ini TIDAK DAPAT DIKEMBALIKAN.`}
                    onConfirm={handlePermanentDelete}
                    onCancel={() => setUserToDelete(null)}
                    isConfirming={isProcessing}
                    confirmText="Hapus Selamanya"
                    cancelText="Batal"
                />
             )}
        </div>
    );
}

export default UserManagementPanel;
