
import React, { useState, useEffect, useMemo, useContext } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import UserFormModal from './UserFormModal';
import FloatingNotification from '../common/FloatingNotification';
import ConfirmationModal from '../common/ConfirmationModal';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon, PencilIcon, TrashIcon, UserCircleIcon, BuildingStorefrontIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 5;
type RoleTab = 'admin' | 'admin_cafe' | 'user';

const UserManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isDeleting, setIsDeleting] = useState(false);
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
            .filter(user => user.role === activeTab)
            .filter(user => user.username.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [users, searchQuery, activeTab]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );

    const counts = useMemo(() => ({
        admin_cafe: users.filter(u => u.role === 'admin_cafe').length,
        user: users.filter(u => u.role === 'user').length,
        admin: users.filter(u => u.role === 'admin').length,
    }), [users]);
    
    const handleSaveUser = async (userData: Partial<User>) => {
        if (!editingUser) {
             setNotification({ message: 'Error: No user selected for editing.', type: 'error' });
             setIsUserFormOpen(false);
             return;
        }

        const { error } = await supabase
            .from('profiles')
            .update({ username: userData.username, role: userData.role })
            .eq('id', editingUser.id);

        if (error) {
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'User profile updated successfully!', type: 'success' });
            await fetchUsers();
        }
        setIsUserFormOpen(false);
        setEditingUser(null);
    };

    const handleArchiveUser = async () => {
        if (!userToDelete || userToDelete.id === currentUser?.id) {
            setNotification({ message: 'Tidak dapat menghapus diri sendiri.', type: 'error' });
            setUserToDelete(null);
            return;
        }
        setIsDeleting(true);
        
        // Use userService to soft delete (archive)
        const { error } = await userService.archiveUser(userToDelete.id);
        
        if (error) {
            setNotification({ message: `Gagal mengarsipkan profil: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Profil "${userToDelete.username}" telah diarsipkan.`, type: 'success' });
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
             if (paginatedUsers.length === 1 && currentPage > 1) {
                setCurrentPage(currentPage - 1);
            }
        }
        setUserToDelete(null);
        setIsDeleting(false);
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
            <span className="px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-xs text-muted font-bold">{count}</span>
        </button>
    );
    
    return (
        <div>
             {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                 <h2 className="text-2xl font-bold font-jakarta">Manajemen User</h2>
            </div>
             <div className="flex border-b border-border mb-4">
                <TabButton role="admin_cafe" icon={<BuildingStorefrontIcon className="h-5 w-5"/>} label="Pengelola" count={counts.admin_cafe} />
                <TabButton role="user" icon={<UserCircleIcon className="h-5 w-5"/>} label="User" count={counts.user} />
                <TabButton role="admin" icon={<PencilIcon className="h-5 w-5"/>} label="Admin" count={counts.admin} />
            </div>

            <div className="relative mb-4">
                <MagnifyingGlassIcon className="h-5 w-5 text-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Cari username..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full p-3 pl-11 rounded-xl border border-border bg-soft dark:bg-gray-700/50 text-primary dark:text-white placeholder-muted focus:ring-2 focus:ring-brand transition-colors"
                />
            </div>

             {/* Desktop Table View */}
             <div className="hidden md:block bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border overflow-x-auto">
                <table className="w-full text-left min-w-[480px]">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Username</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Email</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider text-right">Aksi</th>
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
                                <tr key={user.id} className="border-b border-border last:border-0">
                                    <td className="p-4 font-semibold text-primary dark:text-gray-200">{user.username}</td>
                                    <td className="p-4 text-muted text-sm truncate">{user.email}</td>
                                    <td className="p-4 text-right">
                                        <div className="inline-flex items-center gap-2">
                                            <button 
                                                onClick={() => handleOpenEditForm(user)} 
                                                className="p-2 text-brand rounded-full hover:bg-brand/10 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                aria-label={`Edit user ${user.username}`}
                                                disabled={user.id === currentUser?.id}
                                            >
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button 
                                                onClick={() => setUserToDelete(user)} 
                                                className="p-2 text-accent-pink rounded-full hover:bg-accent-pink/10 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                                                disabled={user.id === currentUser?.id}
                                                aria-label={`Archive user ${user.username}`}
                                                title="Arsipkan User"
                                            >
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>

             {/* Mobile Card View */}
             <div className="md:hidden space-y-3">
                {loading ? (
                     <p className="text-center text-muted">Memuat user...</p>
                ) : paginatedUsers.length === 0 ? (
                     <div className="text-center p-10 bg-soft dark:bg-gray-700/50 rounded-xl border border-border">
                        <InboxIcon className="mx-auto h-10 w-10 text-muted mb-2" />
                        <span className="font-semibold text-muted">User tidak ditemukan</span>
                     </div>
                ) : (
                    paginatedUsers.map(user => (
                        <div key={user.id} className="bg-soft dark:bg-gray-700/50 p-4 rounded-2xl border border-border flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex-1 min-w-0 mr-2">
                                    <p className="font-bold text-lg text-primary dark:text-gray-200 truncate">{user.username}</p>
                                    <p className="text-sm text-muted truncate">{user.email}</p>
                                    <span className="inline-block mt-1 px-2 py-0.5 text-xs font-bold bg-brand/10 dark:bg-brand/20 text-brand rounded-full uppercase">
                                        {(user.role || '').replace('_', ' ')}
                                    </span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                     <button 
                                        onClick={() => handleOpenEditForm(user)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-brand rounded-full shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-50"
                                        disabled={user.id === currentUser?.id}
                                        aria-label="Edit"
                                    >
                                        <PencilIcon className="h-5 w-5" />
                                    </button>
                                    <button 
                                        onClick={() => setUserToDelete(user)} 
                                        className="p-2 bg-white dark:bg-gray-800 text-accent-pink rounded-full shadow-sm border border-gray-100 dark:border-gray-700 disabled:opacity-50"
                                        disabled={user.id === currentUser?.id}
                                        aria-label="Archive"
                                    >
                                        <TrashIcon className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
             </div>

             {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold enabled:hover:bg-gray-300 dark:enabled:hover:bg-gray-500 disabled:opacity-50"><ChevronLeftIcon className="h-5 w-5"/> <span className="hidden sm:inline">Sebelumnya</span></button>
                    <span className="font-semibold text-muted text-sm">Hal {currentPage} / {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold enabled:hover:bg-gray-300 dark:enabled:hover:bg-gray-500 disabled:opacity-50"><span className="hidden sm:inline">Selanjutnya</span> <ChevronRightIcon className="h-5 w-5"/></button>
                </div>
            )}

             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
             {userToDelete && (
                <ConfirmationModal
                    title="Arsipkan User"
                    message={`Yakin ingin mengarsipkan profil "${userToDelete.username}"? User tidak akan bisa login, tapi data bisa dipulihkan nanti.`}
                    onConfirm={handleArchiveUser}
                    onCancel={() => setUserToDelete(null)}
                    isConfirming={isDeleting}
                    confirmText="Ya, Arsipkan"
                />
             )}
        </div>
    );
}

export default UserManagementPanel;
