import React, { useState, useEffect } from 'react';
import { Cafe, Amenity, Vibe, Spot } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { geminiService } from '../../services/geminiService';
import { AMENITIES, VIBES, DISTRICTS, DEFAULT_FAVICON_URL, DEFAULT_COVER_URL } from '../../constants';
import { PriceTier } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import ImageWithFallback from '../common/ImageWithFallback';

interface AdminCafeFormProps {
    cafe?: Cafe | null;
    onSave: (cafe: any) => Promise<void>;
    onCancel: () => void;
    userRole: 'admin' | 'user';
    setNotification: (notification: { message: string, type: 'success' | 'error' } | null) => void;
}

const MultiStepProgressBar: React.FC<{ steps: string[], currentStep: number }> = ({ steps, currentStep }) => (
    <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = currentStep > stepIndex;
            const isActive = currentStep === stepIndex;

            return (
                <React.Fragment key={step}>
                    <div className="flex flex-col items-center text-center">
                        <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                                isCompleted ? 'bg-brand text-white' : isActive ? 'bg-brand/20 text-brand border-2 border-brand' : 'bg-gray-200 dark:bg-gray-700 text-muted'
                            }`}
                        >
                            {isCompleted ? '✓' : stepIndex}
                        </div>
                        <p className={`mt-2 text-xs font-semibold ${isActive || isCompleted ? 'text-primary dark:text-white' : 'text-muted'}`}>{step}</p>
                    </div>
                    {stepIndex < steps.length && (
                        <div className={`flex-1 h-1 mx-2 transition-all duration-300 ${isCompleted ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    )}
                </React.Fragment>
            );
        })}
    </div>
);

const AdminCafeForm: React.FC<AdminCafeFormProps> = ({ cafe, onSave, onCancel, userRole, setNotification }) => {
    
    const [step, setStep] = useState(1);
    const isAdmin = userRole === 'admin';
    const formSteps = isAdmin 
        ? ['Info Dasar', 'Operasional', 'Vibes & Fasilitas', 'Spot Foto', 'Sponsor'] 
        : ['Info Dasar', 'Operasional', 'Vibes & Fasilitas', 'Spot Foto'];

    const parseOpeningHours = (hoursString?: string) => {
        const defaults = { openingTime: '09:00', closingTime: '22:00', is24Hours: false };
        if (!hoursString) return defaults;
        if (hoursString.toLowerCase().includes('24')) return { ...defaults, is24Hours: true };
        const parts = hoursString.split(' - ');
        if (parts.length === 2 && parts[0].includes(':') && parts[1].includes(':')) return { openingTime: parts[0], closingTime: parts[1], is24Hours: false };
        return defaults;
    };
    
    const initialHoursState = parseOpeningHours(cafe?.openingHours);

    const [formData, setFormData] = useState({
        name: cafe?.name || '', description: cafe?.description || '', address: cafe?.address || '', district: cafe?.district || DISTRICTS[0],
        priceTier: cafe?.priceTier || PriceTier.STANDARD, logoUrl: cafe?.logoUrl || '', coverUrl: cafe?.coverUrl || '',
        openingTime: initialHoursState.openingTime, closingTime: initialHoursState.closingTime, is24Hours: initialHoursState.is24Hours,
        lat: cafe?.coords?.lat?.toString() ?? '-2.97', lng: cafe?.coords?.lng?.toString() ?? '104.77',
        isSponsored: cafe?.isSponsored || false, sponsoredUntil: cafe?.sponsoredUntil ? new Date(cafe.sponsoredUntil).toISOString().split('T')[0] : '',
        sponsoredRank: cafe?.sponsoredRank || 0, vibes: cafe?.vibes || [], amenities: cafe?.amenities || [], spots: cafe?.spots || [],
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [spotFiles, setSpotFiles] = useState<(File | null)[]>(cafe?.spots.map(() => null) || []);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [spotPreviews, setSpotPreviews] = useState<(string | null)[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    useEffect(() => { if (logoFile) { const o = URL.createObjectURL(logoFile); setLogoPreview(o); return () => URL.revokeObjectURL(o); } }, [logoFile]);
    useEffect(() => { if (coverFile) { const o = URL.createObjectURL(coverFile); setCoverPreview(o); return () => URL.revokeObjectURL(o); } }, [coverFile]);
    useEffect(() => { const p = spotFiles.map(f => f ? URL.createObjectURL(f) : null); setSpotPreviews(p); return () => p.forEach(u => u && URL.revokeObjectURL(u)); }, [spotFiles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleCoordinateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const regex = /^-?\d*(\.\d{0,8})?$/;
        if (regex.test(value)) {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && e.target.files[0] && setLogoFile(e.target.files[0]);
    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => e.target.files && e.target.files[0] && setCoverFile(e.target.files[0]);
    
    const handleMultiSelectChange = (field: 'vibes' | 'amenities', item: Vibe | Amenity) => {
        setFormData(prev => {
            const current = prev[field] as any[];
            const isSelected = current.some(i => i.id === item.id);
            const newSelection = isSelected ? current.filter(i => i.id !== item.id) : [...current, item];
            return {...prev, [field]: newSelection};
        });
    };

    const handleSpotChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const updatedSpots = [...formData.spots];
        updatedSpots[index] = { ...updatedSpots[index], [name]: value };
        setFormData(prev => ({ ...prev, spots: updatedSpots }));
    };

    const handleSpotFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const newSpotFiles = [...spotFiles];
            newSpotFiles[index] = e.target.files[0];
            setSpotFiles(newSpotFiles);
        }
    };

    const handleAddSpot = () => {
        setFormData(prev => ({ ...prev, spots: [...prev.spots, { id: `spot-${crypto.randomUUID()}`, title: '', tip: '', photoUrl: '' }] }));
        setSpotFiles(prev => [...prev, null]);
    };

    const handleRemoveSpot = (indexToRemove: number) => {
        setFormData(prev => ({ ...prev, spots: prev.spots.filter((_, index) => index !== indexToRemove) }));
        setSpotFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleGenerateDescription = async () => {
        setIsGeneratingDesc(true);
        try {
            const description = await geminiService.generateCafeDescription(formData.name, formData.vibes);
            setFormData(prev => ({ ...prev, description }));
        } catch (error) {
            setNotification({ message: error instanceof Error ? error.message : "Gagal generate deskripsi.", type: 'error' });
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const validateStep = (currentStep: number): boolean => {
        switch (currentStep) {
            case 1:
                if (!formData.name.trim() || !formData.address.trim()) {
                    setNotification({ message: 'Nama Kafe dan Alamat wajib diisi.', type: 'error' });
                    return false;
                }
                break;
            case 2:
                const parsedLat = parseFloat(String(formData.lat));
                const parsedLng = parseFloat(String(formData.lng));
                if (isNaN(parsedLat) || isNaN(parsedLng)) {
                    setNotification({ message: 'Latitude dan Longitude harus berupa angka yang valid.', type: 'error' });
                    return false;
                }
                if (!coverFile && !formData.coverUrl) {
                    setNotification({ message: 'Cover Image wajib diunggah.', type: 'error' });
                    return false;
                }
                break;
            default:
                break;
        }
        return true;
    };

    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => Math.min(s + 1, formSteps.length));
        }
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(step)) return;

        setIsSaving(true);
        setIsUploading(true);
        try {
            let finalLogoUrl = formData.logoUrl;
            if (logoFile) finalLogoUrl = await cloudinaryService.uploadImage(await fileToBase64(logoFile));

            let finalCoverUrl = formData.coverUrl;
            if (coverFile) finalCoverUrl = await cloudinaryService.uploadImage(await fileToBase64(coverFile));

            setIsUploading(false);

            const finalSpots = await Promise.all(
                formData.spots.map(async (spot, index) => {
                    const spotFile = spotFiles[index];
                    let finalPhotoUrl = spot.photoUrl;
                    if (spotFile) finalPhotoUrl = await cloudinaryService.uploadImage(await fileToBase64(spotFile));
                    return { ...spot, photoUrl: finalPhotoUrl };
                })
            );

            const finalOpeningHours = formData.is24Hours ? '24 Jam' : `${formData.openingTime} - ${formData.closingTime}`;

            const dataToSave: Partial<Cafe> = {
                name: formData.name, description: formData.description, address: formData.address, district: formData.district,
                openingHours: finalOpeningHours, priceTier: Number(formData.priceTier),
                coords: { lat: parseFloat(parseFloat(String(formData.lat)).toFixed(8)), lng: parseFloat(parseFloat(String(formData.lng)).toFixed(8)) },
                logoUrl: finalLogoUrl, coverUrl: finalCoverUrl, vibes: formData.vibes, amenities: formData.amenities, spots: finalSpots,
                isSponsored: isAdmin ? formData.isSponsored : false,
                sponsoredUntil: isAdmin && formData.sponsoredUntil ? new Date(formData.sponsoredUntil) : null,
                sponsoredRank: isAdmin ? Number(formData.sponsoredRank) : 0,
            };

            await onSave(dataToSave);
        } catch (error) {
            setNotification({ message: error instanceof Error ? error.message : 'Error tidak diketahui.', type: 'error' });
        } finally {
            setIsSaving(false);
            setIsUploading(false);
        }
    };
    
    const inputClass = "w-full p-3 border border-border bg-soft rounded-xl text-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-200";
    const fileInputClass = "w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand dark:file:bg-brand/20 dark:file:text-brand-light hover:file:bg-brand/20 dark:hover:file:bg-brand/30 transition-colors cursor-pointer";
    const totalSaving = isSaving || isUploading;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up" onClick={onCancel}>
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-border">
                    <h2 className="text-2xl font-bold font-jakarta text-primary text-center mb-4">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                    <MultiStepProgressBar steps={formSteps} currentStep={step} />
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-4 animate-fade-in-up">
                            <h3 className="font-bold text-xl">Langkah 1: Informasi Dasar</h3>
                            <div>
                                <label className="font-semibold text-primary block mb-2">Nama Cafe</label>
                                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Cafe" className={inputClass} required />
                            </div>
                            <div>
                                <label className="font-semibold text-primary block mb-2">Deskripsi</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Deskripsi Cafe (bisa di-generate AI)" className={`${inputClass} h-24`} />
                                <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="mt-2 w-full bg-accent-cyan/10 text-accent-cyan dark:bg-accent-cyan/20 font-semibold py-2 rounded-lg hover:bg-accent-cyan/20 dark:hover:bg-accent-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isGeneratingDesc ? 'Generating...' : '✨ Generate Deskripsi dengan AI'}
                                </button>
                            </div>
                            <div>
                                <label className="font-semibold text-primary block mb-2">Alamat</label>
                                <input name="address" value={formData.address} onChange={handleChange} placeholder="Alamat Lengkap" className={inputClass} required />
                            </div>
                             <div>
                                <label className="font-semibold text-primary block mb-2">Kecamatan</label>
                                <select name="district" value={formData.district} onChange={handleChange} className={inputClass}>
                                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                             </div>
                        </div>
                    )}

                    {step === 2 && (
                         <div className="space-y-4 animate-fade-in-up">
                            <h3 className="font-bold text-xl">Langkah 2: Detail Operasional</h3>
                             <fieldset className="border border-border p-4 rounded-xl">
                                <legend className="font-semibold px-2 text-primary">Jam Operasional</legend>
                                <div className="flex items-center gap-4 mb-4">
                                    <input type="checkbox" id="is24Hours" name="is24Hours" checked={formData.is24Hours} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" />
                                    <label htmlFor="is24Hours" className="font-medium text-primary cursor-pointer">Buka 24 Jam</label>
                                </div>
                                {!formData.is24Hours && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div><label className="block font-medium text-sm text-muted mb-1">Jam Buka</label><input name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></div>
                                        <div><label className="block font-medium text-sm text-muted mb-1">Jam Tutup</label><input name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></div>
                                    </div>
                                )}
                            </fieldset>
                            <div>
                                <label className="font-semibold text-primary block mb-2">Kisaran Harga</label>
                                <select name="priceTier" value={formData.priceTier} onChange={handleChange} className={inputClass}>
                                    <option value={PriceTier.BUDGET}>Budget ($)</option><option value={PriceTier.STANDARD}>Standard ($$)</option><option value={PriceTier.PREMIUM}>Premium ($$$)</option><option value={PriceTier.LUXURY}>Luxury ($$$$)</option>
                                </select>
                            </div>
                            <div>
                                <label className="font-semibold text-primary block mb-2">Koordinat</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <input name="lat" type="text" inputMode="decimal" value={formData.lat} onChange={handleCoordinateChange} placeholder="Latitude" className={inputClass} required />
                                    <input name="lng" type="text" inputMode="decimal" value={formData.lng} onChange={handleCoordinateChange} placeholder="Longitude" className={inputClass} required />
                                </div>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div><label className="font-semibold text-primary block mb-2">Logo (Opsional)</label><ImageWithFallback src={logoPreview || formData.logoUrl} defaultSrc={DEFAULT_FAVICON_URL} alt="Logo" className="w-24 h-24 o-c rounded-xl mb-2 bg-soft border border-border p-1" /><input type="file" accept="image/*" onChange={handleLogoFileChange} className={fileInputClass} /></div>
                                <div><label className="font-semibold text-primary block mb-2">Cover Image (Wajib)</label><ImageWithFallback src={coverPreview || formData.coverUrl} defaultSrc={DEFAULT_COVER_URL} alt="Cover" className="w-full h-24 o-c rounded-xl mb-2" /><input type="file" accept="image/*" onChange={handleCoverFileChange} className={fileInputClass} /></div>
                             </div>
                         </div>
                    )}
                    
                    {step === 3 && (
                         <div className="space-y-4 animate-fade-in-up">
                             <h3 className="font-bold text-xl">Langkah 3: Vibe & Fasilitas</h3>
                             <fieldset className="border border-border p-4 rounded-xl"><legend className="font-semibold px-2 text-primary">Vibes</legend><div className="flex flex-wrap gap-2">{VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-3 py-1 rounded-full border-2 t-c font-semibold ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted h:border-brand/50 h:text-brand'}`}>{v.name}</button>)}</div></fieldset>
                             <fieldset className="border border-border p-4 rounded-xl"><legend className="font-semibold px-2 text-primary">Fasilitas</legend><div className="flex flex-wrap gap-2">{AMENITIES.map(a => <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`px-3 py-1 rounded-full border-2 t-c font-semibold ${formData.amenities.some(fa => fa.id === a.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted h:border-brand/50 h:text-brand'}`}>{a.icon} {a.name}</button>)}</div></fieldset>
                         </div>
                    )}

                    {step === 4 && (
                         <div className="space-y-4 animate-fade-in-up">
                             <h3 className="font-bold text-xl">Langkah 4: Spot Foto</h3>
                             <fieldset className="border border-border p-4 rounded-xl"><legend className="font-semibold px-2 text-primary">Galeri Spot Foto</legend>
                                <div className="space-y-4 max-h-64 overflow-y-auto pr-2">{formData.spots.map((spot, index) => (
                                    <div key={spot.id} className="border b-b p-3 rounded-lg bg-soft dark:bg-gray-900/50 relative pt-6"><button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 rounded-full h-6 w-6 flex i-c j-c font-bold text-lg leading-none h:bg-red-500 h:text-white dark:h:bg-red-400 dark:h:text-white t-a">&times;</button><div className="grid grid-cols-1 gap-2"><ImageWithFallback src={spotPreviews[index] || spot.photoUrl} alt="Spot" className="w-full h-32 o-c rounded-md mb-2" /><input type="file" accept="image/*" onChange={e => handleSpotFileChange(index, e)} className={fileInputClass} /><input name="title" value={spot.title} onChange={e => handleSpotChange(index, e)} placeholder="Judul Spot" className="w-full p-2 border b-b bg-soft rounded-md text-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white mt-2" /><input name="tip" value={spot.tip} onChange={e => handleSpotChange(index, e)} placeholder="Tips Foto" className="w-full p-2 border b-b bg-soft rounded-md text-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white" /></div></div>
                                ))}</div>
                                <button type="button" onClick={handleAddSpot} className="mt-4 w-full bg-gray-100 dark:bg-gray-700 text-primary h:bg-gray-200 dark:h:bg-gray-600 font-semibold py-2 rounded-lg t-a">+ Tambah Spot Foto</button>
                            </fieldset>
                         </div>
                    )}

                    {step === 5 && isAdmin && (
                         <div className="space-y-4 animate-fade-in-up">
                            <h3 className="font-bold text-xl">Langkah 5: Sponsorship</h3>
                             <fieldset className="border border-border p-4 rounded-xl"><legend className="font-semibold px-2 text-primary">Detail Sponsorship</legend>
                                <div className="flex items-center gap-4 mb-4"><label htmlFor="isSponsored" className="font-medium text-primary">Aktifkan Sponsorship</label><input type="checkbox" id="isSponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" /></div>
                                {formData.isSponsored && (<div className="grid grid-cols-2 gap-4"><input name="sponsoredRank" type="number" value={formData.sponsoredRank} onChange={handleChange} placeholder="Ranking (e.g., 1)" className={inputClass} /><input name="sponsoredUntil" type="date" value={formData.sponsoredUntil} onChange={handleChange} className={inputClass} /></div>)}
                            </fieldset>
                         </div>
                    )}

                </form>
                <div className="p-6 flex justify-between gap-4 border-t border-border mt-auto">
                    <button type="button" onClick={step === 1 ? onCancel : prevStep} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition-colors">
                        {step === 1 ? 'Batal' : 'Kembali'}
                    </button>
                    {step < formSteps.length ? (
                        <button type="button" onClick={nextStep} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors">
                            Lanjut
                        </button>
                    ) : (
                        <button type="button" onClick={handleSubmit} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:bg-brand/50" disabled={totalSaving}>
                            {isUploading ? 'Uploading...' : (isSaving ? 'Menyimpan...' : 'Simpan')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCafeForm;