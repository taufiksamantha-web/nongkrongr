import React, { useState } from 'react';
import { Cafe, User } from '../../types';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ChangeOwnerModalProps {
    cafe: Cafe;
    users: User[];
    onSave: (cafeId: string, newOwnerId: string | null) => void;
    onCancel: () => void;
    isSaving: boolean;
}

const ChangeOwnerModal: React.FC<ChangeOwnerModalProps> = ({ cafe, users, onSave, onCancel, isSaving }) => {
    const [selectedOwnerId, setSelectedOwnerId] = useState<string>(cafe.manager_id || 'unassigned');
    
    const handleSubmit = () => {
        onSave(cafe.id, selectedOwnerId === 'unassigned' ? null : selectedOwnerId);
    };
    
    const cafeAdmins = users.filter(u => u.role === 'admin_cafe').sort((a,b) => a.username.localeCompare(b.username));
    const otherUsers = users.filter(u => u.role !== 'admin_cafe').sort((a,b) => a.username.localeCompare(b.username));

    return (
        <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in-up"
            onClick={onCancel}
        >
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <header className="p-6 flex justify-between items-center border-b border-border">
                    <div>
                        <p className="text-sm text-muted">Ubah Owner untuk</p>
                        <h2 className="text-2xl font-bold font-jakarta">{cafe.name}</h2>
                    </div>
                    <button onClick={onCancel} className="p-2 rounded-full hover:bg-soft dark:hover:bg-gray-700">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </header>
                <main className="p-6 space-y-4">
                    <label htmlFor="owner-select" className="font-semibold block mb-2 text-primary">Pilih Pengelola Baru:</label>
                    <select
                        id="owner-select"
                        value={selectedOwnerId}
                        onChange={e => setSelectedOwnerId(e.target.value)}
                        className="w-full p-3 border border-border bg-soft rounded-xl text-primary dark:bg-gray-700 focus:ring-2 focus:ring-brand"
                    >
                        <option value="unassigned">-- Tidak Ditugaskan --</option>
                        <optgroup label="Pengelola Kafe">
                            {cafeAdmins.map(user => (
                                <option key={user.id} value={user.id}>{user.username}</option>
                            ))}
                        </optgroup>
                        <optgroup label="Pengguna Lain">
                            {otherUsers.map(user => (
                                <option key={user.id} value={user.id}>{user.username} ({user.role})</option>
                            ))}
                        </optgroup>
                    </select>
                </main>
                <footer className="p-6 flex justify-end gap-4 border-t border-border">
                    <button onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">Batal</button>
                    <button onClick={handleSubmit} disabled={isSaving} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:bg-brand/50 disabled:cursor-wait">
                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ChangeOwnerModal;