import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface UserFormModalProps {
    userToEdit?: User | null, 
    onSave: (user: Omit<User, 'id'> | User) => void, 
    onCancel: () => void 
}

const UserFormModal: React.FC<UserFormModalProps> = ({ userToEdit, onSave, onCancel }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<'admin' | 'user'>('user');

    useEffect(() => {
        if (userToEdit) {
            setUsername(userToEdit.username);
            setPassword(''); 
            setRole(userToEdit.role);
        }
    }, [userToEdit]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!username || (!userToEdit && !password)) {
            alert("Username dan password wajib diisi untuk user baru.");
            return;
        }

        const userData = {
            username,
            password,
            role,
        };
        
        if (userToEdit) {
            onSave({ ...userData, id: userToEdit.id, password: password || userToEdit.password });
        } else {
            onSave(userData);
        }
    };

    const inputClass = "w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md space-y-4">
                <h2 className="text-2xl font-bold font-jakarta">{userToEdit ? 'Edit User' : 'Tambah User Baru'}</h2>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className={inputClass} required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={userToEdit ? 'Password Baru (opsional)' : 'Password'} className={inputClass} />
                <select value={role} onChange={e => setRole(e.target.value as 'admin' | 'user')} className={inputClass}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>
                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-semibold">Simpan</button>
                </div>
            </form>
        </div>
    );
};

export default UserFormModal;
