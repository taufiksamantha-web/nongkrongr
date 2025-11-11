import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import UserFormModal from './UserFormModal';
import FloatingNotification from '../common/FloatingNotification';
import ConfirmationModal from '../common/ConfirmationModal';

const UserManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [deletingUser, setDeletingUser] = useState<User | null>(null);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('profiles').select('*');
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
    
    const handleSaveUser = async (userData: Partial<User> & { email?: string, password?: string }) => {
        if (!editingUser) {
             console.error("SECURITY WARNING: Client-side user creation is insecure and not supported. This is a placeholder action. Implement a Supabase Edge Function for this.");
             setNotification({ message: 'Fitur Tambah User memerlukan setup backend (Edge Function) untuk keamanan.', type: 'error' });
             setIsUserFormOpen(false);
             return;
        }

        const { id, ...updateData } = { ...editingUser, ...userData };
        const { error } = await supabase
            .from('profiles')
            .update({ username: updateData.username, role: updateData.role })
            .eq('id', id);

        if (error) {
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } else {
            setNotification({ message: 'User profile updated successfully!', type: 'success' });
            await fetchUsers();
        }
        setIsUserFormOpen(false);
        setEditingUser(null);
    };
    
    const handleConfirmDelete = () => {
        if (deletingUser) {
            console.error("SECURITY WARNING: Client-side user deletion is insecure and not supported. This is a placeholder action. Implement a Supabase Edge Function for this.");
            setNotification({ message: 'Fitur Hapus User memerlukan setup backend (Edge Function) untuk keamanan.', type: 'error' });
            setDeletingUser(null);
        }
    };

    const handleOpenAddForm = () => {
        setEditingUser(null);
        setIsUserFormOpen(true);
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
                 {currentUser?.role === 'admin' && (
                    <button onClick={handleOpenAddForm} className="bg-brand/90 text-white font-bold py-2 px-4 rounded-xl hover:bg-brand transition-colors text-sm">
                        + Tambah User
                    </button>
                 )}
            </div>
             <div className="bg-soft dark:bg-gray-700/50 p-2 rounded-2xl border border-border overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-border">
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Username</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Role</th>
                            <th className="p-4 text-sm font-bold text-muted uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={3} className="text-center p-4 text-muted">Loading users...</td></tr>
                        ) : (
                            users.map(user => (
                                <tr key={user.id} className="border-b border-border last:border-0">
                                    <td className="p-4 font-semibold text-primary dark:text-gray-200">{user.username}</td>
                                    <td className="p-4 text-muted">{user.role}</td>
                                    <td className="p-4 space-x-4">
                                        <button onClick={() => handleOpenEditForm(user)} className="text-brand font-bold hover:underline">Edit</button>
                                        {currentUser?.role === 'admin' && (
                                            <button 
                                                onClick={() => setDeletingUser(user)}
                                                className="text-accent-pink font-bold hover:underline disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed"
                                                disabled={user.id === currentUser?.id}
                                                title={user.id === currentUser?.id ? "Tidak dapat menghapus diri sendiri" : "Hapus user"}
                                            >
                                                Hapus
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
             {deletingUser && (
                <ConfirmationModal
                    title="Hapus User"
                    message={`Apakah Anda yakin ingin menghapus user "${deletingUser.username}"? Tindakan ini memerlukan setup backend yang aman.`}
                    confirmText="Lanjutkan"
                    onConfirm={handleConfirmDelete}
                    onCancel={() => setDeletingUser(null)}
                />
             )}
        </div>
    );
}

export default UserManagementPanel;