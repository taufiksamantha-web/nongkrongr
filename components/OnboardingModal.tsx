
import React, { useState, useEffect } from 'react';
import { Camera, Coffee, Laptop, Heart, Users, Music, Moon, ChevronRight, Sparkles, Smile, Star, AtSign } from 'lucide-react';
import { Button, Input, LazyImage } from './UI';
import { uploadImageToCloudinary } from '../services/dataService';
import { User } from '../types';
import { supabase } from '../lib/supabase';

interface OnboardingModalProps {
    user: User;
    onComplete: (data: { name: string, username: string, avatar_url?: string, preferences: string[] }) => void;
}

const VIBE_TAGS = [
    { id: 'Coffee', label: 'Ngopi Santai', icon: Coffee },
    { id: 'Workspace', label: 'Nugas / WFC', icon: Laptop },
    { id: 'Aesthetic', label: 'Foto-foto', icon: Camera },
    { id: 'Date', label: 'Ngedate', icon: Heart },
    { id: 'Live Music', label: 'Live Music', icon: Music },
    { id: '24 Jam', label: 'Begadang', icon: Moon },
    { id: 'Family', label: 'Keluarga', icon: Users },
    { id: 'Cheap', label: 'Hemat', icon: Star },
];

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ user, onComplete }) => {
    const [step, setStep] = useState(1);
    const [name, setName] = useState(user.name);
    const [username, setUsername] = useState(user.username || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState(user.avatar_url);
    const [preferences, setPreferences] = useState<string[]>(user.preferences || []);
    const [isUploading, setIsUploading] = useState(false);

    // Sync data terbaru dari DB saat mount untuk memastikan keakuratan is_onboarded
    useEffect(() => {
        setName(user.name);
        setUsername(user.username);
        setAvatarPreview(user.avatar_url);
        setPreferences(user.preferences || []);
    }, [user]);

    const handleNext = () => setStep(prev => prev + 1);
    const handleTagToggle = (tag: string) => {
        setPreferences(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleFinish = async () => {
        setIsUploading(true);
        let finalAvatar = user.avatar_url;
        
        try {
            if (avatarFile) {
                // Fix: uploadImageToCloudinary expects exactly 1 argument (the file)
                finalAvatar = await uploadImageToCloudinary(avatarFile);
            }
            onComplete({ name, username, avatar_url: finalAvatar, preferences });
        } catch (e) {
            console.error("Onboarding failed", e);
            alert("Gagal menyimpan data. Coba lagi ya!");
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
            <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-[2.5rem] shadow-2xl overflow-hidden relative m-4 border-4 border-white/20">
                {/* Background Decoration */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-[80px] -mr-20 -mt-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -ml-20 -mb-20 animate-pulse delay-700"></div>

                <div className="relative z-10 p-8 min-h-[550px] flex flex-col">
                    
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8 justify-center">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-2 rounded-full transition-all duration-500 ${step >= i ? 'w-8 bg-orange-500' : 'w-2 bg-gray-200 dark:bg-slate-700'}`}></div>
                        ))}
                    </div>

                    {step === 1 && (
                        <div className="flex-1 flex flex-col items-center text-center animate-in slide-in-from-right duration-500">
                            <div className="w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6 text-orange-600 dark:text-orange-400 animate-bounce">
                                <Smile size={40} />
                            </div>
                            <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white mb-2">Kenalan Dulu Dong! 👋</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">Biar makin akrab, lengkapi profilmu ya.</p>

                            <div className="relative w-32 h-32 mb-6 group cursor-pointer">
                                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-orange-500 to-red-500 p-[3px]"></div>
                                <div className="absolute inset-[3px] rounded-full overflow-hidden bg-gray-100">
                                    <LazyImage src={avatarPreview} className="w-full h-full object-cover" alt="Avatar" />
                                </div>
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if(file) { setAvatarFile(file); setAvatarPreview(URL.createObjectURL(file)); }
                                }} />
                                <div className="absolute bottom-0 right-0 bg-white dark:bg-slate-800 p-2 rounded-full shadow-lg border border-gray-100 dark:border-slate-700 text-orange-500">
                                    <Camera size={16} />
                                </div>
                            </div>

                            <div className="w-full space-y-4">
                                <Input 
                                    value={name} 
                                    onChange={(e) => setName(e.target.value)} 
                                    placeholder="Nama Panggilan" 
                                    className="text-center font-bold text-lg h-14 rounded-2xl"
                                />
                                <Input 
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())} 
                                    placeholder="Username" 
                                    icon={AtSign}
                                    className="text-center font-medium text-base h-12 rounded-2xl"
                                />
                            </div>
                            
                            <Button onClick={handleNext} disabled={!name.trim() || !username.trim()} className="w-full mt-auto h-14 rounded-2xl text-lg shadow-xl shadow-orange-500/20">Lanjut <ChevronRight /></Button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="flex-1 flex flex-col animate-in slide-in-from-right duration-500">
                            <div className="text-center mb-6">
                                <h2 className="text-2xl font-display font-black text-gray-900 dark:text-white mb-2">Apa Vibe Kamu? 🎧</h2>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Pilih minimal 3 hal yang kamu suka.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 mb-6">
                                {VIBE_TAGS.map(tag => (
                                    <button
                                        key={tag.id}
                                        onClick={() => handleTagToggle(tag.id)}
                                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${preferences.includes(tag.id) ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400' : 'border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-400 hover:border-orange-200'}`}
                                    >
                                        <tag.icon size={24} />
                                        <span className="text-xs font-bold">{tag.label}</span>
                                    </button>
                                ))}
                            </div>

                            <Button onClick={handleNext} disabled={preferences.length < 3} className="w-full mt-auto h-14 rounded-2xl text-lg shadow-xl shadow-orange-500/20">Lanjut <ChevronRight /></Button>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="flex-1 flex flex-col items-center text-center justify-center animate-in slide-in-from-right duration-500">
                            <div className="relative mb-8">
                                <div className="absolute inset-0 bg-green-500 blur-[60px] opacity-20 rounded-full animate-pulse"></div>
                                <Sparkles size={80} className="text-orange-500 relative z-10 animate-bounce" />
                            </div>
                            
                            <h2 className="text-4xl font-display font-black text-gray-900 dark:text-white mb-4 leading-tight">Siap Meluncur! 🚀</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-lg mb-10 max-w-xs">
                                Akun kamu sudah siap. Yuk mulai petualangan nongkrongmu, <strong>{username}</strong>!
                            </p>

                            <Button onClick={handleFinish} disabled={isUploading} className="w-full h-16 rounded-2xl text-xl shadow-2xl shadow-orange-500/30 font-black tracking-wide">
                                {isUploading ? 'Menyiapkan...' : 'Mulai Jelajah'}
                            </Button>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};
