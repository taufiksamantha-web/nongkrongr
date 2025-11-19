
import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fileToBase64 } from '../../utils/fileUtils';
import { cloudinaryService } from '../../services/cloudinaryService';
import FloatingNotification from '../common/FloatingNotification';
import { PhotoIcon, ArrowUpOnSquareIcon } from '@heroicons/react/24/solid';

const ProfileEditor: React.FC = () => {
    const { currentUser, updateUserProfile } = useAuth();
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatar_url || null);
    const [isSaving, setIsSaving] = useState(false);
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

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
        setNotification(null);
        
        try {
            const base64Image = await fileToBase64(avatarFile);
            const newAvatarUrl = await cloudinaryService.uploadImage(base64Image);
            
            const { error } = await updateUserProfile({ avatar_url: newAvatarUrl });
            
            if (error) {
                throw error;
            }
            
            setNotification({ message: 'Foto profil berhasil diperbarui!', type: 'success' });
            setAvatarFile(null); // Clear file after successful save

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
        <div>
             {notification && <FloatingNotification {...notification} onClose={() => setNotification(null)} />}
            <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative group">
                    <img
                        src={avatarPreview || `https://ui-avatars.com/api/?name=${(currentUser.username || 'User').replace(/\s/g, '+')}&background=random&color=fff`}
                        alt="Avatar Preview"
                        className="h-32 w-32 rounded-full object-cover border-4 border-card dark:border-gray-800 shadow-lg"
                    />
                    <label htmlFor="avatar-upload" className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                        <PhotoIcon className="h-8 w-8" />
                    </label>
                    <input id="avatar-upload" type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={isSaving} />
                </div>
                <div className="flex-1 text-center sm:text-left">
                    <h4 className="text-xl font-bold">{currentUser.username}</h4>
                    <p className="text-muted">{currentUser.email}</p>
                    <div className="mt-4">
                        <button
                            onClick={handleSave}
                            disabled={!avatarFile || isSaving}
                            className="inline-flex items-center gap-2 bg-brand text-white font-bold py-2 px-5 rounded-xl hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-wait"
                        >
                            {isSaving ? 'Menyimpan...' : <><ArrowUpOnSquareIcon className="h-5 w-5" /> Simpan Perubahan</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfileEditor;
