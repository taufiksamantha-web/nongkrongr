
import React, { useState, useCallback, useEffect } from 'react';
import { Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { cloudinaryService } from '../services/cloudinaryService';
import { fileToBase64 } from '../utils/fileUtils';
import { PhotoIcon, SparklesIcon, BriefcaseIcon, SunIcon, MoonIcon, UserGroupIcon, CurrencyDollarIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface ReviewFormProps {
    onSubmit: (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => Promise<void>;
    isSubmitting: boolean;
    cafeId: string;
}

const PRICE_OPTIONS = [
    { label: '< 25rb', value: '25000' },
    { label: '25-50rb', value: '50000' },
    { label: '> 50rb', value: '75000' }
];

const CrowdSlider: React.FC<{ icon: React.ReactNode, label: string, value: number, onChange: (val: number) => void, colorClass: string, disabled: boolean }> = ({ icon, label, value, onChange, colorClass, disabled }) => (
    <div className="text-center">
        <div className="flex items-center justify-center gap-2 text-muted mb-2">
            {icon}
            <span className="font-semibold text-sm">{label}</span>
        </div>
        <input type="range" min="1" max="5" value={value} onChange={e => onChange(parseInt(e.target.value))} className={`w-full ${colorClass}`} disabled={disabled}/>
        <p className="font-bold text-lg text-primary">{value}</p>
    </div>
);


const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, isSubmitting, cafeId }) => {
    const { currentUser } = useAuth();
    const [author, setAuthor] = useState('');
    const [text, setText] = useState('');
    const [ratingAesthetic, setRatingAesthetic] = useState(8);
    const [ratingWork, setRatingWork] = useState(8);
    const [crowdMorning, setCrowdMorning] = useState(3);
    const [crowdAfternoon, setCrowdAfternoon] = useState(3);
    const [crowdEvening, setCrowdEvening] = useState(3);
    const [priceSpent, setPriceSpent] = useState('');
    const [photo, setPhoto] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDragOver, setIsDragOver] = useState(false);
    const [isConfirming, setIsConfirming] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setAuthor(currentUser.username);
        }
    }, [currentUser]);


    const handleFileChange = useCallback(async (file: File | null) => {
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                setPhoto(base64);
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Gagal memproses file. Silakan coba file lain.");
                setPhoto(null);
            }
        }
    }, []);
    
    const onDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    }, [handleFileChange]);

    const resetForm = () => {
        if (!currentUser) setAuthor('');
        setText(''); setRatingAesthetic(8); setRatingWork(8);
        setCrowdMorning(3); setCrowdAfternoon(3); setCrowdEvening(3);
        setPriceSpent(''); setPhoto(null);
        setIsConfirming(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting || isUploading) return;
        
        let uploadedPhotoUrl = '';
        if (photo) {
            setIsUploading(true);
            try {
                uploadedPhotoUrl = await cloudinaryService.uploadImage(photo);
            } catch (error) {
                console.error(error);
                alert("Gagal mengupload foto. Pastikan preset 'nongkrongr_uploads' sudah dikonfigurasi sebagai 'unsigned' di dashboard Cloudinary Anda.");
                setIsUploading(false); return;
            }
            setIsUploading(false);
        }

        await onSubmit({
            cafe_id: cafeId, author, text, ratingAesthetic, ratingWork,
            crowdMorning, crowdAfternoon, crowdEvening,
            priceSpent: Number(priceSpent) || 0,
            photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
        });
        resetForm();
    };
    
    const handleInitialSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (author.trim() && text.trim()) {
            setIsConfirming(true);
        } else {
            // This will trigger the form's native validation hints
            e.currentTarget.form?.requestSubmit();
        }
    };
    
    const totalSubmitting = isSubmitting || isUploading;
    const formDisabled = totalSubmitting || isConfirming;
    const inputClass = "w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white placeholder:text-muted focus:ring-2 focus:ring-brand transition-all disabled:opacity-70";
    
    return (
        <form onSubmit={handleSubmit} className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-6">
            <h3 className="text-xl font-bold font-jakarta text-center">Beri Review Kamu!</h3>
            
            <input type="text" placeholder="Nama Kamu" value={author} onChange={e => setAuthor(e.target.value)} required readOnly={!!currentUser} className={`${inputClass} ${!!currentUser ? 'font-semibold' : ''}`} disabled={formDisabled}/>
            <textarea placeholder="Ceritain pengalamanmu di sini..." value={text} onChange={e => setText(e.target.value)} required className={`${inputClass} h-24`} disabled={formDisabled}></textarea>
            
            <fieldset className="space-y-4" disabled={formDisabled}>
                <legend className="text-lg font-bold font-jakarta mb-2">Beri Skor</legend>
                <div className="space-y-3">
                     <div>
                        <label className="flex items-center gap-2 font-semibold text-primary">
                           <SparklesIcon className="h-5 w-5 text-accent-pink"/> Estetik ({ratingAesthetic})
                        </label>
                        <input type="range" min="1" max="10" value={ratingAesthetic} onChange={e => setRatingAesthetic(parseInt(e.target.value))} className="w-full accent-accent-pink"/>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 font-semibold text-primary">
                           <BriefcaseIcon className="h-5 w-5 text-accent-cyan"/> Nugas / Kerja ({ratingWork})
                        </label>
                        <input type="range" min="1" max="10" value={ratingWork} onChange={e => setRatingWork(parseInt(e.target.value))} className="w-full accent-accent-cyan"/>
                    </div>
                </div>
            </fieldset>

             <fieldset className="space-y-4" disabled={formDisabled}>
                <legend className="text-lg font-bold font-jakarta mb-2">Tingkat Keramaian</legend>
                <div className="grid grid-cols-3 gap-4 p-2 bg-soft dark:bg-gray-700/50 rounded-xl">
                   <CrowdSlider icon={<SunIcon className="h-5 w-5"/>} label="Pagi" value={crowdMorning} onChange={setCrowdMorning} colorClass="accent-accent-amber" disabled={formDisabled}/>
                   <CrowdSlider icon={<UserGroupIcon className="h-5 w-5"/>} label="Siang" value={crowdAfternoon} onChange={setCrowdAfternoon} colorClass="accent-brand/75" disabled={formDisabled}/>
                   <CrowdSlider icon={<MoonIcon className="h-5 w-5"/>} label="Malam" value={crowdEvening} onChange={setCrowdEvening} colorClass="accent-brand" disabled={formDisabled}/>
                </div>
            </fieldset>

            <fieldset className="space-y-4" disabled={formDisabled}>
                <legend className="text-lg font-bold font-jakarta mb-2">Detail Tambahan</legend>
                <div className="space-y-4">
                    <div>
                        <label className="flex items-center gap-2 font-semibold text-primary mb-2">
                           <CurrencyDollarIcon className="h-5 w-5 text-green-500"/> Total Jajan (per orang)
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {PRICE_OPTIONS.map(opt => (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => setPriceSpent(prev => prev === opt.value ? '' : opt.value)}
                                    className={`px-4 py-2 rounded-full font-semibold text-sm border-2 transition-all disabled:opacity-70 ${priceSpent === opt.value ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50'}`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 font-semibold text-primary mb-2">
                           <PhotoIcon className="h-5 w-5 text-blue-500"/> Foto (Opsional)
                        </label>
                        {photo ? (
                             <div className="relative group">
                                <img src={photo} alt="Preview" className="w-full h-40 object-cover rounded-xl"/>
                                <button type="button" onClick={() => setPhoto(null)} className={`absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full transition-opacity ${formDisabled ? 'hidden' : 'opacity-0 group-hover:opacity-100'}`} aria-label="Hapus gambar">
                                    <XCircleIcon className="h-6 w-6"/>
                                </button>
                             </div>
                        ) : (
                             <label 
                                htmlFor="photo-upload" 
                                className={`w-full text-center p-6 rounded-xl border-2 border-dashed flex flex-col items-center justify-center transition-colors ${formDisabled ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'} ${isDragOver ? 'border-brand bg-brand/10' : 'border-border bg-soft hover:border-brand/50'}`}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if(!formDisabled) setIsDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                                onDrop={onDrop}
                             >
                                <PhotoIcon className="h-8 w-8 text-muted mb-2"/>
                                <span className="font-semibold text-primary">Pilih atau jatuhkan foto di sini</span>
                                <span className="text-xs text-muted">Maks. 5MB</span>
                            </label>
                        )}
                        <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={formDisabled} />
                    </div>
                </div>
            </fieldset>

            {isConfirming ? (
                <div className="flex justify-end gap-4">
                    <button type="button" onClick={() => setIsConfirming(false)} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                        Batal
                    </button>
                    <button type="submit" disabled={totalSubmitting} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:bg-brand/50 disabled:cursor-wait">
                        {isUploading ? 'Uploading...' : (isSubmitting ? 'Mengirim...' : 'Kirim')}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleInitialSubmitClick}
                    disabled={totalSubmitting}
                    className="w-full bg-brand text-white font-bold py-3 rounded-2xl hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    Kirim Review
                </button>
            )}
        </form>
    );
};

export default ReviewForm;