import React, { useState, useEffect, useMemo, useContext } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import UserFormModal from './UserFormModal';
import FloatingNotification from '../common/FloatingNotification';
import ConfirmationModal from '../common/ConfirmationModal';
import { ChevronLeftIcon, ChevronRightIcon, MagnifyingGlassIcon, InboxIcon } from '@heroicons/react/24/solid';

const ITEMS_PER_PAGE = 5;

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

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*').order('username', { ascending: true });
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

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.username.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [users, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
    const paginatedUsers = filteredUsers.slice(
        (currentPage - 1) * ITEMS_PER_PAGE,
        currentPage * ITEMS_PER_PAGE
    );
    
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

    const handleDeleteUser = async () => {
        if (!userToDelete || userToDelete.id === currentUser?.id) {
            setNotification({ message: 'Tidak dapat menghapus diri sendiri.', type: 'error' });
            setUserToDelete(null);
            return;
        }
        setIsDeleting(true);
        // PENTING: Menghapus user dari tabel 'auth.users' membutuhkan hak akses admin
        // dan idealnya dilakukan melalui Supabase Edge Function untuk keamanan.
        // Kode di bawah ini hanya menghapus profil, bukan data otentikasi user.
        const { error } = await supabase.from('profiles').delete().eq('id', userToDelete.id);
        if (error) {
            setNotification({ message: `Gagal menghapus profil: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: `Profil "${userToDelete.username}" telah dihapus.`, type: 'success' });
            setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
        }
        setUserToDelete(null);
        setIsDeleting(false);
    };
    
    const handleOpenEditForm = (user: User) => {
        setEditingUser(user);
        setIsUserFormOpen(true);
    };
    
    return (
        <div>
             {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-4 flex-wrap gap-4">
                 <h2 className="text-2xl font-bold font-jakarta">User Management</h2>
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
             <div className="bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border overflow-x-auto">
                <table className="w-full text-left min-w-[480px]">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Username</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Role</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="text-center p-4 text-muted">Loading users...</td></tr>
                        ) : paginatedUsers.length === 0 ? (
                            <tr><td colSpan={3} className="text-center p-10 text-muted">
                                <InboxIcon className="mx-auto h-10 w-10 mb-2" />
                                <span className="font-semibold">User tidak ditemukan</span>
                            </td></tr>
                        ) : (
                            paginatedUsers.map(user => (
                                <tr key={user.id} className="border-b border-border last:border-0">
                                    <td className="p-4 font-semibold text-primary dark:text-gray-200">{user.username}</td>
                                    <td className="p-4"><span className={`px-2 py-1 text-xs font-bold rounded-full ${user.role === 'admin' ? 'bg-brand/10 text-brand' : 'bg-gray-200 dark:bg-gray-600 text-muted'}`}>{user.role.toUpperCase()}</span></td>
                                    <td className="p-4 space-x-4 text-right">
                                        <button onClick={() => handleOpenEditForm(user)} className="text-brand font-bold hover:underline">Edit</button>
                                        <button 
                                            onClick={() => setUserToDelete(user)} 
                                            className="text-accent-pink font-bold hover:underline disabled:text-gray-400 disabled:cursor-not-allowed disabled:no-underline"
                                            disabled={user.id === currentUser?.id}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>

             {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6">
                    <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold enabled:hover:bg-gray-300 dark:enabled:hover:bg-gray-500 disabled:opacity-50"><ChevronLeftIcon className="h-5 w-5"/> Sebelumnya</button>
                    <span className="font-semibold text-muted text-sm">Halaman {currentPage} dari {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold enabled:hover:bg-gray-300 dark:enabled:hover:bg-gray-500 disabled:opacity-50">Selanjutnya <ChevronRightIcon className="h-5 w-5"/></button>
                </div>
            )}

             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
             {userToDelete && (
                <ConfirmationModal
                    title="Hapus User Profile"
                    message={`Yakin ingin menghapus profil "${userToDelete.username}"? Ini hanya akan menghapus data dari tabel profil, bukan akun otentikasi pengguna.`}
                    onConfirm={handleDeleteUser}
                    onCancel={() => setUserToDelete(null)}
                    isConfirming={isDeleting}
                />
             )}
        </div>
    );
}

export default UserManagementPanel;