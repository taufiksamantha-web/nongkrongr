import React, { useState, useContext } from 'react';
import { Cafe } from '../../types';
import { CafeContext } from '../../context/CafeContext';
import { BuildingStorefrontIcon, CheckBadgeIcon, XCircleIcon } from '@heroicons/react/24/outline';
import ConfirmationModal from '../common/ConfirmationModal';
import FloatingNotification from '../common/FloatingNotification';
import AdminCafeForm from './AdminCafeForm';
import PendingReviews from './PendingReviews';
import UserManagementPanel from './UserManagementPanel';
import StatCard from './StatCard';

const AdminDashboard: React.FC = () => {
    const { cafes, loading, addCafe, updateCafe, deleteCafe, saveChangesToCloud, hasUnsavedChanges } = useContext(CafeContext)!;
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);
    const [cafeToDelete, setCafeToDelete] = useState<Cafe | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSave = (data: any) => {
        if (editingCafe) {
            updateCafe(editingCafe.id, data);
        } else {
            addCafe(data);
        }
        setIsFormOpen(false);
        setEditingCafe(null);
    };

    const handleConfirmDeleteCafe = () => {
        if (cafeToDelete) {
            deleteCafe(cafeToDelete.id);
            setCafeToDelete(null);
        }
    };
    
    const handleSaveChangesToCloud = async () => {
        setIsSaving(true);
        setNotification(null);
        
        const result = await saveChangesToCloud();

        if (result.success) {
            setNotification({ message: 'Perubahan berhasil disimpan!', type: 'success' });
        } else {
            const detailedMessage = `Gagal menyimpan: ${result.error || 'Silakan cek konsol untuk detail.'}`;
            setNotification({ message: detailedMessage, type: 'error' });
        }
        
        setIsSaving(false);
    };
    
    const totalCafes = cafes.length;
    const sponsoredCafes = cafes.filter(cafe => cafe.isSponsored).length;
    const nonSponsoredCafes = totalCafes - sponsoredCafes;

    return (
        <>
            {notification && <FloatingNotification message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                <h1 className="text-4xl font-bold font-jakarta">Dashboard Overview</h1>
                 <div className="flex items-center gap-4">
                    <button
                        onClick={handleSaveChangesToCloud}
                        className={`font-bold py-2 px-6 rounded-2xl transition-all duration-300 ${hasUnsavedChanges ? 'bg-green-500 text-white hover:bg-green-600 animate-pulse' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                        disabled={isSaving || loading || !hasUnsavedChanges}
                    >
                        {isSaving ? 'Menyimpan...' : (hasUnsavedChanges ? 'Simpan Perubahan' : '✓ Tersimpan')}
                    </button>
                    <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-primary text-white font-bold py-2 px-6 rounded-2xl">
                        + Tambah Cafe
                    </button>
                </div>
            </div>
            
             {/* Stats Panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard 
                    title="Total Cafe" 
                    value={totalCafes} 
                    icon={<BuildingStorefrontIcon className="h-8 w-8 text-primary" />} 
                    color="primary" 
                />
                <StatCard 
                    title="Sponsored" 
                    value={sponsoredCafes} 
                    icon={<CheckBadgeIcon className="h-8 w-8 text-green-600 dark:text-green-400" />} 
                    color="green" 
                />
                <StatCard 
                    title="Regular" 
                    value={nonSponsoredCafes} 
                    icon={<XCircleIcon className="h-8 w-8 text-red-600 dark:text-red-400" />} 
                    color="red" 
                />
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
                                        <button onClick={() => setCafeToDelete(cafe)} className="text-accent-pink font-bold hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <PendingReviews />
            <UserManagementPanel />

            {isFormOpen && <AdminCafeForm cafe={editingCafe} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} />}
            {cafeToDelete && (
                <ConfirmationModal
                    title="Hapus Cafe"
                    message={`Apakah Anda yakin ingin menghapus "${cafeToDelete.name}"? Perubahan ini akan disimpan secara lokal.`}
                    onConfirm={handleConfirmDeleteCafe}
                    onCancel={() => setCafeToDelete(null)}
                />
            )}
        </>
    );
};

export default AdminDashboard;
