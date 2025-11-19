
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fileToBase64 } from '../../utils/fileUtils';
import { cloudinaryService } from '../../services/cloudinaryService';
import { PhotoIcon, ArrowUpOnSquareIcon, XMarkIcon } from '@heroicons/react/24/solid';

interface ProfileUpdateModalProps {
    onClose: () => void;
    setNotification: (notification: { message: string; type: 'success' | 'error' } | null) => void;
}

const ProfileUpdateModal: React.FC<ProfileUpdateModalProps> = ({ onClose, setNotification }) => {
    const { currentUser, updateUserProfile } = useAuth();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            try {
                const base64 = await fileToBase64(file);
                setAvatarPreview(base64);
            } catch (error) {
                console.error("Error creating preview:", error);
                setNotification({ message: 'Gagal membuat pratinjau gambar.', type: 'error' });
            }
        }
    };
    
    const handleSave = async () => {
        if (!avatarFile || !currentUser) return;
        
        setIsSaving(true);
        
        try {
            const base64Image = await fileToBase64(avatarFile);
            const newAvatarUrl = await cloudinaryService.uploadImage(base64Image);
            
            const { error } = await updateUserProfile({ avatar_url: newAvatarUrl });
            
            if (error) {
                throw error;
            }
            
            setNotification({ message: 'Foto profil berhasil diperbarui!', type: 'success' });
            onClose();

        } catch (error: any) {
            console.error("Failed to save profile:", error);
            setNotification({ message: `Gagal menyimpan: ${error.message}`, type: 'error' });
            // Revert preview to original if save fails
            setAvatarPreview(currentUser.avatar_url || null);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (!currentUser) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in-up" onClick={onClose}>
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-md border border-border" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h3 className="text-xl font-bold font-jakarta">Ganti Foto Profil</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-soft transition-colors">
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-6 flex flex-col items-center gap-6">
                    <div className="relative group">
                        <img
                            src={avatarPreview || `https://ui-avatars.com/api/?name=${(currentUser.username || 'User').replace(/\s/g, '+')}&background=random&color=fff`}
                            alt="Avatar Preview"
                            className="h-40 w-40 rounded-full object-cover border-4 border-card dark:border-gray-800 shadow-lg"
                        />
                        <label htmlFor="avatar-upload-modal" className="absolute inset-0 bg-black/50 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
                            <PhotoIcon className="h-10 w-10 mb-1" />
                            <span className="text-xs font-bold">Ubah Foto</span>
                        </label>
                        <input id="avatar-upload-modal" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSaving} />
                    </div>
                    
                    <div className="text-center">
                        <p className="text-primary font-bold text-lg">{currentUser.username}</p>
                        <p className="text-muted text-sm">{currentUser.email}</p>
                    </div>

                    <div className="flex gap-3 w-full mt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-primary rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                            disabled={isSaving}
                        >
                            Batal
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={!avatarFile || isSaving}
                            className="flex-1 flex items-center justify-center gap-2 bg-brand text-white font-bold py-2 rounded-xl hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Menyimpan...' : 'Simpan'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileUpdateModal;
