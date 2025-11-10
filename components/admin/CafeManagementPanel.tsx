import React, { useState, useContext } from 'react';
import { Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { useAuth } from '../../context/AuthContext';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import AdminCafeForm from './AdminCafeForm';

const CafeManagementPanel: React.FC = () => {
    const { currentUser } = useAuth();
    const { cafes, loading, addCafe, updateCafe, deleteCafe } = useContext(CafeContext)!;
    
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [cafeToDelete, setCafeToDelete] = useState<Cafe | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSave = async (data: any) => {
        setIsSaving(true);
        setNotification(null);
        try {
            if (editingCafe) {
                await updateCafe(editingCafe.id, data);
                setNotification({ message: 'Kafe berhasil diperbarui!', type: 'success' });
            } else {
                await addCafe(data);
                setNotification({ message: 'Kafe baru berhasil ditambahkan!', type: 'success' });
            }
            setIsFormOpen(false);
            setEditingCafe(null);
        } catch (error: any) {
            setNotification({ message: `Error: ${error.message}`, type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleConfirmDeleteCafe = async () => {
        if (cafeToDelete) {
            setIsSaving(true);
            setNotification(null);
            try {
                await deleteCafe(cafeToDelete.id);
                setNotification({ message: `"${cafeToDelete.name}" berhasil dihapus.`, type: 'success' });
            } catch (error: any) {
                setNotification({ message: `Error: ${error.message}`, type: 'error' });
            } finally {
                setCafeToDelete(null);
                setIsSaving(false);
            }
        }
    };

    return (
         <>
            {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h2 className="text-3xl font-bold font-jakarta">Daftar Cafe</h2>
                <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-primary text-white font-bold py-2 px-6 rounded-2xl hover:bg-primary/90 transition-colors">
                    + Tambah Cafe
                </button>
            </div>

            {loading ? <p>Loading cafes...</p> : (
                <div className="bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kecamatan</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sponsored</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cafes.map(cafe => (
                                <tr key={cafe.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-primary/5 dark:hover:bg-primary/10">
                                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{cafe.name}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400">{cafe.district}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400">{cafe.isSponsored ? '✅' : '❌'}</td>
                                    <td className="p-4 space-x-4">
                                        <button onClick={() => { setEditingCafe(cafe); setIsFormOpen(true); }} className="text-primary font-bold hover:underline">Edit</button>
                                        {currentUser?.role === 'admin' && (
                                            <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink font-bold hover:underline">Delete</button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {isFormOpen && <AdminCafeForm cafe={editingCafe} userRole={currentUser!.role} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} isSaving={isSaving}/>}
            
            {cafeToDelete && currentUser?.role === 'admin' && (
                <ConfirmationModal
                    title="Hapus Cafe"
                    message={`Apakah Anda yakin ingin menghapus "${cafeToDelete.name}"? Tindakan ini tidak dapat diurungkan.`}
                    onConfirm={handleConfirmDeleteCafe}
                    onCancel={() => setCafeToDelete(null)}
                />
            )}
        </>
    )
}

export default CafeManagementPanel;