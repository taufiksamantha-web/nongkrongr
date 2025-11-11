import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import UserFormModal from './UserFormModal';
import FloatingNotification from '../common/FloatingNotification';

const UserManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
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
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
             </div>
             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
        </div>
    );
}

export default UserManagementPanel;