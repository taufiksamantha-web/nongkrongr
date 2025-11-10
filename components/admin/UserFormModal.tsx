import React, { useState, useEffect } from 'react';
import { User } from '../../types';

interface UserFormModalProps {
    userToEdit: User | null, 
    onSave: (user: Partial<User> & { email?: string, password?: string }) => void, 
    onCancel: () => void 
}

const UserFormModal: React.FC<UserFormModalProps> = ({ userToEdit, onSave, onCancel }) => {
    const isAddMode = !userToEdit;
    const [formData, setFormData] = useState({
        username: '',
        role: 'user' as 'admin' | 'user',
        email: '',
        password: ''
    });

    useEffect(() => {
        if (userToEdit) {
            setFormData({
                username: userToEdit.username,
                role: userToEdit.role,
                email: '',
                password: ''
            });
        }
    }, [userToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = isAddMode 
            ? { email: formData.email, password: formData.password, username: formData.username, role: formData.role }
            : { ...userToEdit, username: formData.username, role: formData.role };
        onSave(dataToSave);
    };

    const inputClass = "w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-md space-y-4">
                <h2 className="text-2xl font-bold font-jakarta">{isAddMode ? 'Tambah User Baru' : 'Edit User'}</h2>
                
                {isAddMode && (
                    <>
                        <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className={inputClass} required />
                        <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password (min. 6 karakter)" className={inputClass} required />
                    </>
                )}
                
                <input name="username" type="text" value={formData.username} onChange={handleChange} placeholder="Username" className={inputClass} required />
                <select name="role" value={formData.role} onChange={handleChange} className={inputClass}>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                </select>

                <div className="pt-2 text-sm text-gray-500 dark:text-gray-400">
                    <p><strong>Note:</strong> {isAddMode 
                        ? "Pengguna baru akan dibuat di Supabase Auth dan tabel profiles."
                        : "Anda hanya dapat mengubah username dan peran. Untuk mengubah password user lain, diperlukan implementasi backend yang aman (misal: Supabase Edge Function)."
                    }</p>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-semibold">Simpan</button>
                </div>
            </form>
        </div>
    );
};

export default UserFormModal;