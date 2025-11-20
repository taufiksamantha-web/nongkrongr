
import React, { useState, useCallback, useEffect } from 'react';
import { Review } from '../types';
import { useAuth } from '../context/AuthContext';
import { cloudinaryService } from '../services/cloudinaryService';
import { fileToBase64 } from '../utils/fileUtils';
import { PhotoIcon, SparklesIcon, BriefcaseIcon, SunIcon, MoonIcon, UserGroupIcon, CurrencyDollarIcon, XCircleIcon, ChevronDownIcon, CloudArrowUpIcon, BanknotesIcon } from '@heroicons/react/24/solid';

interface ReviewFormProps {
    onSubmit: (review: Omit<Review, 'id' | 'createdAt' | 'status' | 'helpful_count'> & { cafe_id: string }) => Promise<void>;
    isSubmitting: boolean;
    cafeId: string;
}

const PRICE_OPTIONS = [
    { label: '< 25rb', value: '25000', desc: 'Hemat', icons: 1 },
    { label: '25-50rb', value: '50000', desc: 'Standar', icons: 2 },
    { label: '> 50rb', value: '75000', desc: 'Sultan', icons: 3 }
];

// --- Helper Visuals ---

const getRatingLabel = (value: number) => {
    if (value >= 9) return "Sempurna! 😍";
    if (value >= 7) return "Keren 👍";
    if (value >= 5) return "Lumayan 🙂";
    if (value >= 3) return "Biasa Aja 😐";
    return "Kurang 😞";
};

const getCrowdLabel = (value: number) => {
    if (value === 1) return "Sepi (Nyaman)";
    if (value === 2) return "Agak Sepi";
    if (value === 3) return "Sedang";
    if (value === 4) return "Ramai";
    return "Padat Merayap";
};

const getCrowdColor = (value: number) => {
    if (value <= 2) return '#10b981'; // Emerald-500
    if (value === 3) return '#f59e0b'; // Amber-500
    return '#ef4444'; // Red-500
};

// --- Custom Slider Component ---
interface RangeSliderProps {
    min: number;
    max: number;
    value: number;
    onChange: (val: number) => void;
    disabled?: boolean;
    fillColor?: string; // Hex or specific color string
    dynamicColor?: boolean; // If true, changes color based on value (for Crowd)
}

const RangeSlider: React.FC<RangeSliderProps> = ({ min, max, value, onChange, disabled, fillColor = '#7C4DFF', dynamicColor = false }) => {
    const percentage = ((value - min) / (max - min)) * 100;
    
    // Determine active color
    const activeColor = dynamicColor ? getCrowdColor(value) : fillColor;
    
    return (
        <div className="relative w-full h-6 flex items-center group">
            <input 
                type="range" 
                min={min} 
                max={max} 
                value={value} 
                onChange={(e) => onChange(parseInt(e.target.value))} 
                disabled={disabled}
                className="w-full h-3 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand/50 transition-all z-10 bg-gray-200 dark:bg-gray-700"
                style={{
                    background: `linear-gradient(to right, ${activeColor} 0%, ${activeColor} ${percentage}%, transparent ${percentage}%, transparent 100%)`
                }}
            />
            {/* Custom Thumb Styles via Global CSS or these utilities are tricky without standard CSS, 
                but the standard appearance-none + background gradient gives the "Fill" effect requested. 
            */}
            <style>{`
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 3px solid ${activeColor};
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    margin-top: 0px; /* Adjust if needed */
                    transition: transform 0.1s, border-color 0.3s;
                }
                input[type=range]::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
                input[type=range]::-moz-range-thumb {
                    height: 20px;
                    width: 20px;
                    border-radius: 50%;
                    background: #ffffff;
                    border: 3px solid ${activeColor};
                    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
                    transition: transform 0.1s, border-color 0.3s;
                }
            `}</style>
        </div>
    );
};


// Helper component for the responsive accordion sections
const FormSection: React.FC<{ 
    title: string; 
    isOpen: boolean; 
    onToggle: () => void; 
    children: React.ReactNode;
    disabled: boolean;
}> = ({ title, isOpen, onToggle, children, disabled }) => (
    <div className="border-b border-border last:border-0 pb-4 last:pb-0 md:border-none md:pb-0">
        <button 
            type="button" 
            onClick={onToggle}
            disabled={disabled}
            className="w-full flex justify-between items-center py-2 md:py-0 md:cursor-default text-left focus:outline-none group"
        >
            <legend className="text-lg font-bold font-jakarta text-primary dark:text-white">{title}</legend>
            {/* Chevron only visible on mobile to indicate toggle */}
            <ChevronDownIcon className={`h-5 w-5 text-muted md:hidden transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
        
        {/* Content: Hidden on mobile unless open, Always block on desktop */}
        <div className={`mt-4 space-y-4 transition-all duration-300 ease-in-out ${isOpen ? 'block' : 'hidden'} md:block`}>
            {children}
        </div>
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

    // Accordion states for mobile - Default CLOSED
    const [sectionsOpen, setSectionsOpen] = useState({
        score: false,
        details: false
    });

    useEffect(() => {
        if (currentUser) {
            setAuthor(currentUser.username);
        }
    }, [currentUser]);

    const toggleSection = (section: keyof typeof sectionsOpen) => {
        setSectionsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    const handleFileChange = useCallback(async (file: File | null) => {
        if (file) {
            // Validation: Max 5MB
            if (file.size > 5 * 1024 * 1024) {
                alert("Ukuran file terlalu besar. Maksimal 5MB.");
                return;
            }

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
        setSectionsOpen({ score: false, details: false });
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
            // Open all sections if they are closed when clicking submit to show review details
            setSectionsOpen({ score: true, details: true });
        } else {
            // This will trigger the form's native validation hints
            e.currentTarget.form?.requestSubmit();
        }
    };
    
    const totalSubmitting = isSubmitting || isUploading;
    const formDisabled = totalSubmitting || isConfirming;
    const inputClass = "w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white placeholder:text-muted focus:ring-2 focus:ring-brand transition-all disabled:opacity-70";
    
    return (
        <form onSubmit={handleSubmit} className="bg-card border border-border p-6 rounded-3xl shadow-sm space-y-6 sticky top-24">
            <h3 className="text-xl font-bold font-jakarta text-center">Beri Review Kamu!</h3>
            
            <div className="space-y-4">
                <input type="text" placeholder="Nama Kamu" value={author} onChange={e => setAuthor(e.target.value)} required readOnly={!!currentUser} className={`${inputClass} ${!!currentUser ? 'font-semibold' : ''}`} disabled={formDisabled}/>
                <textarea placeholder="Ceritain pengalamanmu di sini..." value={text} onChange={e => setText(e.target.value)} required className={`${inputClass} h-24`} disabled={formDisabled}></textarea>
            </div>
            
            <FormSection 
                title="Beri Skor & Keramaian" 
                isOpen={sectionsOpen.score} 
                onToggle={() => toggleSection('score')}
                disabled={formDisabled}
            >
                <div className="space-y-6">
                     {/* Aesthetic Score */}
                     <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 font-bold text-primary dark:text-white text-sm">
                               <SparklesIcon className="h-4 w-4 text-accent-pink"/> Estetik
                            </label>
                            <span className="text-xs font-bold text-accent-pink px-2 py-0.5 bg-accent-pink/10 rounded-full">
                                {ratingAesthetic}/10 • {getRatingLabel(ratingAesthetic)}
                            </span>
                         </div>
                         <RangeSlider 
                            min={1} max={10} 
                            value={ratingAesthetic} 
                            onChange={setRatingAesthetic} 
                            fillColor="#FF4081" // accent-pink
                            disabled={formDisabled} 
                        />
                    </div>

                    {/* Work Score */}
                    <div className="space-y-2">
                         <div className="flex justify-between items-center">
                            <label className="flex items-center gap-2 font-bold text-primary dark:text-white text-sm">
                               <BriefcaseIcon className="h-4 w-4 text-accent-cyan"/> Nugas / Kerja
                            </label>
                            <span className="text-xs font-bold text-accent-cyan px-2 py-0.5 bg-accent-cyan/10 rounded-full">
                                {ratingWork}/10 • {getRatingLabel(ratingWork)}
                            </span>
                         </div>
                         <RangeSlider 
                            min={1} max={10} 
                            value={ratingWork} 
                            onChange={setRatingWork} 
                            fillColor="#00E5FF" // accent-cyan
                            disabled={formDisabled} 
                        />
                    </div>

                    <div className="pt-4 border-t border-border">
                        <p className="font-bold text-sm text-primary dark:text-white mb-4">Tingkat Keramaian</p>
                        
                        <div className="space-y-5">
                            {/* Morning Crowd */}
                            <div className="space-y-1">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="flex items-center gap-1 text-muted font-semibold"><SunIcon className="h-3 w-3"/> Pagi</span>
                                    <span className="font-bold" style={{ color: getCrowdColor(crowdMorning) }}>{getCrowdLabel(crowdMorning)}</span>
                                </div>
                                <RangeSlider min={1} max={5} value={crowdMorning} onChange={setCrowdMorning} dynamicColor={true} disabled={formDisabled}/>
                            </div>

                             {/* Afternoon Crowd */}
                             <div className="space-y-1">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="flex items-center gap-1 text-muted font-semibold"><UserGroupIcon className="h-3 w-3"/> Siang</span>
                                    <span className="font-bold" style={{ color: getCrowdColor(crowdAfternoon) }}>{getCrowdLabel(crowdAfternoon)}</span>
                                </div>
                                <RangeSlider min={1} max={5} value={crowdAfternoon} onChange={setCrowdAfternoon} dynamicColor={true} disabled={formDisabled}/>
                            </div>

                             {/* Evening Crowd */}
                             <div className="space-y-1">
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="flex items-center gap-1 text-muted font-semibold"><MoonIcon className="h-3 w-3"/> Malam</span>
                                    <span className="font-bold" style={{ color: getCrowdColor(crowdEvening) }}>{getCrowdLabel(crowdEvening)}</span>
                                </div>
                                <RangeSlider min={1} max={5} value={crowdEvening} onChange={setCrowdEvening} dynamicColor={true} disabled={formDisabled}/>
                            </div>
                        </div>
                    </div>
                </div>
            </FormSection>

            <FormSection 
                title="Detail Tambahan" 
                isOpen={sectionsOpen.details} 
                onToggle={() => toggleSection('details')}
                disabled={formDisabled}
            >
                <div className="space-y-5">
                    {/* Price Selection - Styled as Cards */}
                    <div>
                        <label className="flex items-center gap-2 font-semibold text-primary dark:text-white mb-3 text-sm">
                           <CurrencyDollarIcon className="h-4 w-4 text-green-500"/> Total Jajan (per orang)
                        </label>
                        <div className="grid grid-cols-3 gap-2 sm:gap-3">
                            {PRICE_OPTIONS.map(opt => {
                                const isSelected = priceSpent === opt.value;
                                return (
                                    <button
                                        type="button"
                                        key={opt.value}
                                        onClick={() => setPriceSpent(prev => prev === opt.value ? '' : opt.value)}
                                        disabled={formDisabled}
                                        className={`
                                            relative flex flex-col items-center justify-center py-3 px-1 rounded-xl border-2 transition-all duration-300 group
                                            ${isSelected 
                                                ? 'bg-gradient-to-br from-brand/90 to-brand border-brand text-white shadow-lg shadow-brand/20 scale-[1.02]' 
                                                : 'bg-soft dark:bg-gray-700/50 border-border text-muted hover:border-brand/40 hover:bg-brand/5'
                                            }
                                            disabled:opacity-60 disabled:cursor-not-allowed
                                        `}
                                    >
                                        <div className={`flex mb-1 ${isSelected ? 'text-yellow-300' : 'text-muted group-hover:text-brand'}`}>
                                            {[...Array(opt.icons)].map((_, i) => (
                                                <BanknotesIcon key={i} className="h-3.5 w-3.5 sm:h-4 sm:w-4 -ml-1 first:ml-0" />
                                            ))}
                                        </div>
                                        <span className={`text-[10px] sm:text-xs font-bold ${isSelected ? 'text-white' : 'text-primary dark:text-white'}`}>{opt.label}</span>
                                        <span className={`text-[9px] mt-0.5 font-medium ${isSelected ? 'text-white/80' : 'text-muted'}`}>{opt.desc}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Photo Upload - Styled Dropzone */}
                    <div>
                        <label className="flex items-center gap-2 font-semibold text-primary dark:text-white mb-3 text-sm">
                           <PhotoIcon className="h-4 w-4 text-blue-500"/> Foto (Opsional)
                        </label>
                        {photo ? (
                             <div className="relative group animate-fade-in-up">
                                <img src={photo} alt="Preview" className="w-full h-48 object-cover rounded-2xl border border-border shadow-sm"/>
                                <div className="absolute inset-0 bg-black/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <button 
                                    type="button" 
                                    onClick={() => setPhoto(null)} 
                                    className={`absolute top-3 right-3 p-1.5 bg-red-500 text-white rounded-full shadow-lg transform hover:scale-110 transition-all ${formDisabled ? 'hidden' : ''}`} 
                                    aria-label="Hapus gambar"
                                >
                                    <XCircleIcon className="h-5 w-5"/>
                                </button>
                                <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-3 py-1.5 rounded-lg backdrop-blur-md">
                                    Siap Diupload
                                </div>
                             </div>
                        ) : (
                             <label 
                                htmlFor="photo-upload" 
                                className={`
                                    relative w-full h-40 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer overflow-hidden
                                    ${isDragOver 
                                        ? 'border-brand bg-brand/10 scale-[1.01]' 
                                        : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/30 hover:border-brand/50 hover:bg-brand/5'
                                    }
                                    ${formDisabled ? 'opacity-60 cursor-not-allowed' : ''}
                                `}
                                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if(!formDisabled) setIsDragOver(true); }}
                                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(false); }}
                                onDrop={onDrop}
                             >
                                <div className={`p-3 rounded-full bg-white dark:bg-gray-600 mb-3 shadow-sm transition-transform duration-300 ${isDragOver ? 'scale-110' : ''}`}>
                                    <CloudArrowUpIcon className={`h-6 w-6 ${isDragOver ? 'text-brand' : 'text-muted'}`}/>
                                </div>
                                <span className="font-semibold text-sm text-primary dark:text-gray-200">
                                    {isDragOver ? 'Lepaskan Foto Disini' : 'Klik atau Drag Foto'}
                                </span>
                                <span className="text-xs text-muted mt-1">Format JPG/PNG, Maks. 5MB</span>
                            </label>
                        )}
                        <input id="photo-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : null)} className="hidden" disabled={formDisabled} />
                    </div>
                </div>
            </FormSection>

            {isConfirming ? (
                <div className="flex justify-end gap-4 pt-2">
                    <button type="button" onClick={() => setIsConfirming(false)} className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        Edit Lagi
                    </button>
                    <button type="submit" disabled={totalSubmitting} className="px-6 py-2.5 bg-gradient-to-r from-brand to-brand-light text-white rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-brand/25 disabled:opacity-70 disabled:cursor-wait flex items-center gap-2">
                        {isUploading ? 'Mengupload...' : (isSubmitting ? 'Mengirim...' : 'Ya, Kirim!')}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleInitialSubmitClick}
                    disabled={totalSubmitting}
                    className="w-full bg-brand text-white font-bold py-3.5 rounded-2xl hover:bg-brand/90 transition-all disabled:bg-brand/50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-brand/20 hover:shadow-brand/30 hover:-translate-y-0.5"
                >
                    Kirim Review
                </button>
            )}
        </form>
    );
};

export default ReviewForm;
