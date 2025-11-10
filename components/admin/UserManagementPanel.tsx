import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { userService } from '../../services/userService';
import ConfirmationModal from '../common/ConfirmationModal';
import UserFormModal from './UserFormModal';

const UserManagementPanel: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isUserFormOpen, setIsUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    
    useEffect(() => {
        setUsers(userService.getUsers());
    }, []);
    
    const handleSaveUser = (userData: Omit<User, 'id'> | User) => {
        let updatedUsers;
        if ('id' in userData) {
            updatedUsers = userService.updateUser(userData.id, userData);
        } else {
            updatedUsers = userService.addUser(userData);
        }
        setUsers(updatedUsers);
        setIsUserFormOpen(false);
        setEditingUser(null);
    };

    const handleOpenAddForm = () => {
        setEditingUser(null);
        setIsUserFormOpen(true);
    };

    const handleOpenEditForm = (user: User) => {
        setEditingUser(user);
        setIsUserFormOpen(true);
    };

    const handleConfirmDeleteUser = () => {
        if (userToDelete) {
            const updatedUsers = userService.deleteUser(userToDelete.id);
            setUsers(updatedUsers);
            setUserToDelete(null); 
        }
    };

    return (
        <div className="mt-12">
            <div className="flex justify-between items-center mb-6">
                 <h2 className="text-3xl font-bold font-jakarta">User Management</h2>
                 <button onClick={handleOpenAddForm} className="bg-secondary text-black font-bold py-2 px-6 rounded-2xl">
                    + Tambah User
                </button>
            </div>
             <div className="bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-sm overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                            <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Username</th>
                            <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Role</th>
                            <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id} className="border-b border-gray-100 dark:border-gray-700">
                                <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{user.username}</td>
                                <td className="p-4 text-gray-600 dark:text-gray-400">{user.role}</td>
                                <td className="p-4 space-x-4">
                                    <button onClick={() => handleOpenEditForm(user)} className="text-primary font-bold hover:underline">Edit</button>
                                    <button onClick={() => setUserToDelete(user)} className="text-accent-pink font-bold hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
             {isUserFormOpen && <UserFormModal userToEdit={editingUser} onSave={handleSaveUser} onCancel={() => setIsUserFormOpen(false)} />}
             {userToDelete && (
                <ConfirmationModal
                    title="Hapus Pengguna"
                    message={`Apakah Anda yakin ingin menghapus pengguna "${userToDelete.username}"?`}
                    onConfirm={handleConfirmDeleteUser}
                    onCancel={() => setUserToDelete(null)}
                />
            )}
        </div>
    );
}

export default UserManagementPanel;
