import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cafe, Amenity, Vibe, Spot, Event } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { geminiService } from '../../services/geminiService';
import { AMENITIES, VIBES, SOUTH_SUMATRA_CITIES, DEFAULT_COVER_URL } from '../../constants';
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

const MultiStepProgressBar: React.FC<{ steps: string[], currentStep: number, onStepClick: (step: number) => void }> = ({ steps, currentStep, onStepClick }) => (
    <div className="flex items-start justify-between">
        {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = currentStep > stepIndex;
            const isActive = currentStep === stepIndex;

            return (
                <React.Fragment key={step}>
                    <button
                        type="button"
                        onClick={() => onStepClick(stepIndex)}
                        className="flex flex-col items-center text-center px-1 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed group"
                        aria-label={`Go to step ${stepIndex}: ${step}`}
                    >
                        <div
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg transition-all duration-300 group-hover:scale-110 ${
                                isCompleted ? 'bg-brand text-white' : isActive ? 'bg-brand/20 text-brand border-2 border-brand' : 'bg-gray-200 dark:bg-gray-700 text-muted'
                            }`}
                        >
                            {isCompleted ? '✓' : stepIndex}
                        </div>
                        <p className={`mt-2 text-[10px] sm:text-xs font-semibold w-16 sm:w-20 ${isActive || isCompleted ? 'text-primary dark:text-white' : 'text-muted'}`}>{step}</p>
                    </button>
                    {stepIndex < steps.length && (
                        <div className={`flex-1 h-1 mt-5 transition-all duration-300 ${isCompleted || isActive ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    )}
                </React.Fragment>
            );
        })}
    </div>
);


const FormGroup: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={className}>{children}</div>
);

const FormLabel: React.FC<{ htmlFor: string, children: React.ReactNode }> = ({ htmlFor, children }) => (
    <label htmlFor={htmlFor} className="font-semibold text-primary block mb-2">{children}</label>
);

const FormHelperText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-sm text-muted mt-1">{children}</p>
);

const AdminCafeForm: React.FC<AdminCafeFormProps> = ({ cafe, onSave, onCancel, userRole, setNotification }) => {
    
    const [step, setStep] = useState(1);
    const isAdmin = userRole === 'admin';
    const formSteps = isAdmin 
        ? ['Info Dasar', 'Operasional', 'Vibes & Fasilitas', 'Spot Foto', 'Events', 'Sponsor'] 
        : ['Info Dasar', 'Operasional', 'Vibes & Fasilitas', 'Spot Foto', 'Events'];

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
        name: cafe?.name || '', description: cafe?.description || '', address: cafe?.address || '', city: cafe?.city || SOUTH_SUMATRA_CITIES[0], district: cafe?.district || '',
        priceTier: cafe?.priceTier || PriceTier.STANDARD, logoUrl: cafe?.logoUrl || '', coverUrl: cafe?.coverUrl || '',
        openingTime: initialHoursState.openingTime, closingTime: initialHoursState.closingTime, is24Hours: initialHoursState.is24Hours,
        lat: cafe?.coords?.lat?.toString() ?? '', lng: cafe?.coords?.lng?.toString() ?? '',
        isSponsored: cafe?.isSponsored || false, sponsoredUntil: cafe?.sponsoredUntil ? new Date(cafe.sponsoredUntil).toISOString().split('T')[0] : '',
        sponsoredRank: cafe?.sponsoredRank || 0, vibes: cafe?.vibes || [], amenities: cafe?.amenities || [], spots: cafe?.spots || [],
        events: cafe?.events || [],
    });
    
    const [coordsInput, setCoordsInput] = useState(() => (cafe?.coords?.lat && cafe?.coords?.lng ? `${cafe.coords.lat}, ${cafe.coords.lng}` : ''));
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [spotFiles, setSpotFiles] = useState<(File | null)[]>(cafe?.spots.map(() => null) || []);
    const [eventFiles, setEventFiles] = useState<(File | null)[]>(cafe?.events.map(() => null) || []);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [spotPreviews, setSpotPreviews] = useState<(string | null)[]>([]);
    const [eventPreviews, setEventPreviews] = useState<(string | null)[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const geocodeTimeoutRef = useRef<number | null>(null);


    useEffect(() => { if (logoFile) { const o = URL.createObjectURL(logoFile); setLogoPreview(o); return () => URL.revokeObjectURL(o); } }, [logoFile]);
    useEffect(() => { if (coverFile) { const o = URL.createObjectURL(coverFile); setCoverPreview(o); return () => URL.revokeObjectURL(o); } }, [coverFile]);
    useEffect(() => { const p = spotFiles.map(f => f ? URL.createObjectURL(f) : null); setSpotPreviews(p); return () => p.forEach(u => u && URL.revokeObjectURL(u)); }, [spotFiles]);
    useEffect(() => { const p = eventFiles.map(f => f ? URL.createObjectURL(f) : null); setEventPreviews(p); return () => p.forEach(u => u && URL.revokeObjectURL(u)); }, [eventFiles]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setCoordsInput(value);
        const match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[, ]+\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
        if (match) {
            const [lat, lng] = [parseFloat(match[1]), parseFloat(match[2])];
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) setFormData(prev => ({ ...prev, lat: String(lat), lng: String(lng) }));
        } else {
            setFormData(prev => ({ ...prev, lat: '', lng: ''}));
        }
    };

    const handleReverseGeocode = useCallback(() => {
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        geocodeTimeoutRef.current = window.setTimeout(async () => {
            const [lat, lng] = [parseFloat(String(formData.lat)), parseFloat(String(formData.lng))];
            if (isNaN(lat) || isNaN(lng)) return;
            setIsGeocoding(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
                if (!res.ok) throw new Error('Geocoding service failed.');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setFormData(prev => ({ ...prev, address: data.display_name || '', ...(data.address.city && { city: data.address.city }), ...(data.address.suburb && { district: data.address.suburb }) }));
                setNotification({ message: "Alamat berhasil ditemukan!", type: 'success' });
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                setNotification({ message: "Gagal mendapatkan alamat dari koordinat.", type: 'error' });
            } finally {
                setIsGeocoding(false);
            }
        }, 800);
    }, [formData.lat, formData.lng, setNotification]);
    
    useEffect(() => {
        if (formData.lat.trim() && formData.lng.trim()) handleReverseGeocode();
    }, [formData.lat, formData.lng, handleReverseGeocode]);

    const handleMultiSelectChange = (field: 'vibes' | 'amenities', item: Vibe | Amenity) => {
        setFormData(prev => ({...prev, [field]: (prev[field] as any[]).some(i => i.id === item.id) ? (prev[field] as any[]).filter(i => i.id !== item.id) : [...prev[field], item]}));
    };

    const handleSpotChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const updatedSpots = [...formData.spots];
        updatedSpots[index] = { ...updatedSpots[index], [e.target.name]: e.target.value };
        setFormData(prev => ({ ...prev, spots: updatedSpots }));
    };

    const handleSpotFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const newSpotFiles = [...spotFiles];
            newSpotFiles[index] = e.target.files[0];
            setSpotFiles(newSpotFiles);
        }
    };

    const handleAddSpot = () => {
        setFormData(prev => ({ ...prev, spots: [...prev.spots, { id: `spot-${crypto.randomUUID()}`, title: '', tip: '', photoUrl: '' }] }));
        setSpotFiles(prev => [...prev, null]);
    };

    const handleRemoveSpot = (index: number) => {
        setFormData(prev => ({ ...prev, spots: prev.spots.filter((_, i) => i !== index) }));
        setSpotFiles(prev => prev.filter((_, i) => i !== index));
    };

    // Event Handlers
    const handleEventChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const updatedEvents = [...formData.events];
        updatedEvents[index] = { ...updatedEvents[index], [name]: value };
        setFormData(prev => ({ ...prev, events: updatedEvents }));
    };

    const handleEventFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            const newEventFiles = [...eventFiles];
            newEventFiles[index] = e.target.files[0];
            setEventFiles(newEventFiles);
        }
    };
    
    const handleAddEvent = () => {
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({...prev, events: [...prev.events, { id: `evt-${crypto.randomUUID()}`, name: '', description: '', start_date: today, end_date: today }] }));
        setEventFiles(prev => [...prev, null]);
    };

    const handleRemoveEvent = (index: number) => {
        setFormData(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== index) }));
        setEventFiles(prev => prev.filter((_, i) => i !== index));
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
        if (currentStep === 1 && (!formData.name.trim() || !formData.address.trim() || isNaN(parseFloat(String(formData.lat))) || isNaN(parseFloat(String(formData.lng))))) {
            setNotification({ message: 'Nama Kafe, Alamat, dan Koordinat Peta wajib diisi dengan benar.', type: 'error' });
            return false;
        }
        if (currentStep === 2 && !coverFile && !formData.coverUrl) {
            setNotification({ message: 'Cover Image wajib diunggah.', type: 'error' });
            return false;
        }
        setNotification(null);
        return true;
    };
    
    const validateAllSteps = (): boolean => {
        for (let i = 1; i <= step; i++) {
            if (!validateStep(i)) {
                setStep(i);
                return false;
            }
        }
        return true;
    };

    const nextStep = () => { if (validateStep(step)) setStep(s => Math.min(s + 1, formSteps.length)); };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => { if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && step < formSteps.length) { e.preventDefault(); nextStep(); } };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAllSteps()) return;
        setIsSaving(true);
        try {
            setIsUploading(true);
            const [finalLogoUrl, finalCoverUrl] = await Promise.all([
                logoFile ? cloudinaryService.uploadImage(await fileToBase64(logoFile)) : Promise.resolve(formData.logoUrl),
                coverFile ? cloudinaryService.uploadImage(await fileToBase64(coverFile)) : Promise.resolve(formData.coverUrl),
            ]);
            const processedSpots = await Promise.all(formData.spots.map(async (spot, i) => ({...spot, photoUrl: spotFiles[i] ? await cloudinaryService.uploadImage(await fileToBase64(spotFiles[i]!)) : spot.photoUrl})));
            const processedEvents = await Promise.all(formData.events.map(async (event, i) => ({...event, imageUrl: eventFiles[i] ? await cloudinaryService.uploadImage(await fileToBase64(eventFiles[i]!)) : event.imageUrl})));
            setIsUploading(false);

            await onSave({
                name: formData.name, description: formData.description, address: formData.address, city: formData.city, district: formData.district, openingHours: formData.is24Hours ? '24 Jam' : `${formData.openingTime} - ${formData.closingTime}`, priceTier: Number(formData.priceTier), coords: { lat: parseFloat(String(formData.lat)), lng: parseFloat(String(formData.lng)) }, logoUrl: finalLogoUrl, coverUrl: finalCoverUrl, vibes: formData.vibes, amenities: formData.amenities, spots: processedSpots.filter(s => s.photoUrl || s.title.trim()), events: processedEvents.filter(e => e.name.trim()), isSponsored: isAdmin ? formData.isSponsored : false, sponsoredUntil: isAdmin && formData.sponsoredUntil ? new Date(formData.sponsoredUntil) : null, sponsoredRank: isAdmin ? Number(formData.sponsoredRank) : 0,
            });
        } catch (error) {
            setNotification({ message: error instanceof Error ? error.message : 'Error tidak diketahui.', type: 'error' });
        } finally {
            setIsSaving(false);
            setIsUploading(false);
        }
    };
    
    const inputClass = "w-full p-3 border border-border bg-soft rounded-xl text-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-200";
    const fileInputClass = "w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand dark:file:bg-brand/20 dark:file:text-brand-light hover:file:bg-brand/20 dark:hover:file:bg-brand/30 transition-colors cursor-pointer";
    const fieldsetStyles = "border border-border p-4 rounded-xl space-y-4";
    const legendStyles = "font-semibold px-2 text-primary";
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up" onClick={onCancel}>
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-8 border-b border-border"><h2 className="text-2xl font-bold font-jakarta text-primary text-center mb-4">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2><MultiStepProgressBar steps={formSteps} currentStep={step} onStepClick={setStep} /></div>
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-4 sm:p-8 space-y-6 overflow-y-auto">
                    {step === 1 && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 1: Informasi Dasar</h3> <fieldset className={fieldsetStyles}> <legend className={legendStyles}>Identitas Kafe</legend> <FormGroup><FormLabel htmlFor="name">Nama Cafe</FormLabel><input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Kopi Senja" className={inputClass} required /></FormGroup> <FormGroup><FormLabel htmlFor="description">Deskripsi</FormLabel><textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Jelaskan keunikan dari cafe ini..." className={`${inputClass} h-24`} /><FormHelperText>Tulis deskripsi singkat atau biarkan AI yang membuatnya.</FormHelperText><button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="mt-2 w-full bg-accent-cyan/10 text-accent-cyan dark:bg-accent-cyan/20 font-semibold py-2 rounded-lg hover:bg-accent-cyan/20 dark:hover:bg-accent-cyan/30 disabled:opacity-50"> {isGeneratingDesc ? 'Generating...' : '✨ Generate Deskripsi dengan AI'} </button></FormGroup> </fieldset> <fieldset className={fieldsetStyles}> <legend className={legendStyles}>Lokasi</legend> <FormGroup><FormLabel htmlFor="coords">Koordinat Peta</FormLabel><input id="coords" name="coords" type="text" value={coordsInput} onChange={handleCoordsChange} placeholder="-2.9760, 104.7458" className={inputClass} required /><FormHelperText>Salin & tempel koordinat dari Google Maps. Alamat akan terisi otomatis.</FormHelperText></FormGroup> <FormGroup><FormLabel htmlFor="address">Alamat (Otomatis)</FormLabel><div className="relative"><input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Menunggu koordinat..." className={`${inputClass} pr-10`} required />{isGeocoding && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-brand"></div></div>}</div></FormGroup> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormGroup><FormLabel htmlFor="city">Kota/Kabupaten</FormLabel><select id="city" name="city" value={formData.city} onChange={handleChange} className={inputClass}>{SOUTH_SUMATRA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}</select></FormGroup><FormGroup><FormLabel htmlFor="district">Kecamatan</FormLabel><input id="district" name="district" value={formData.district} onChange={handleChange} placeholder="e.g., Ilir Barat I" className={inputClass} /></FormGroup></div> </fieldset> </div> )}
                    {step === 2 && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 2: Detail Operasional</h3> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Jam Operasional</legend><div className="flex items-center gap-4"><input type="checkbox" id="is24Hours" name="is24Hours" checked={formData.is24Hours} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" /><label htmlFor="is24Hours" className="font-medium text-primary">Buka 24 Jam</label></div>{!formData.is24Hours && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormGroup><FormLabel htmlFor="openingTime">Jam Buka</FormLabel><input id="openingTime" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></FormGroup><FormGroup><FormLabel htmlFor="closingTime">Jam Tutup</FormLabel><input id="closingTime" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></FormGroup></div>)}</fieldset> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Detail Lainnya</legend><FormGroup><FormLabel htmlFor="priceTier">Kisaran Harga</FormLabel><select id="priceTier" name="priceTier" value={formData.priceTier} onChange={handleChange} className={inputClass}><option value={PriceTier.BUDGET}>Budget ($)</option><option value={PriceTier.STANDARD}>Standard ($$)</option><option value={PriceTier.PREMIUM}>Premium ($$$)</option><option value={PriceTier.LUXURY}>Luxury ($$$$)</option></select></FormGroup></fieldset> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Gambar</legend><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><FormGroup><FormLabel htmlFor="logo">Logo (Opsional)</FormLabel><ImageWithFallback src={logoPreview || formData.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl mb-2 bg-soft border" fallbackText="Logo"/><input id="logo" type="file" accept="image/*" onChange={(e) => e.target.files && setLogoFile(e.target.files[0])} className={fileInputClass} /></FormGroup><FormGroup><FormLabel htmlFor="cover">Cover Image (Wajib)</FormLabel><ImageWithFallback src={coverPreview || formData.coverUrl} defaultSrc={DEFAULT_COVER_URL} alt="Cover" className="w-full h-24 object-cover rounded-xl mb-2" /><input id="cover" type="file" accept="image/*" onChange={(e) => e.target.files && setCoverFile(e.target.files[0])} className={fileInputClass} /></FormGroup></div></fieldset> </div> )}
                    {step === 3 && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 3: Vibe & Fasilitas</h3> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Pilih Vibe</legend><div className="flex flex-wrap gap-3">{VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-4 py-2 rounded-full border-2 font-semibold ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50'}`}>{v.name}</button>)}</div></fieldset> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Pilih Fasilitas</legend><div className="flex flex-wrap gap-3">{AMENITIES.map(a => <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`px-4 py-2 rounded-full border-2 font-semibold ${formData.amenities.some(fa => fa.id === a.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50'}`}>{a.icon} {a.name}</button>)}</div></fieldset> </div> )}
                    {step === 4 && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 4: Spot Foto</h3> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Galeri Spot Foto</legend><div className="space-y-4 max-h-80 overflow-y-auto pr-2">{formData.spots.map((spot, index) => (<div key={spot.id} className="border p-4 rounded-lg bg-soft dark:bg-gray-900/50 relative"><button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-500/20 rounded-full h-7 w-7 flex items-center justify-center font-bold text-xl hover:bg-red-500 hover:text-white">&times;</button><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormGroup><FormLabel htmlFor={`spot-photo-${index}`}>Foto Spot</FormLabel><ImageWithFallback src={spotPreviews[index] || spot.photoUrl} alt="Spot" className="w-full h-32 object-cover rounded-md mb-2" /><input id={`spot-photo-${index}`} type="file" accept="image/*" onChange={e => handleSpotFileChange(index, e)} className={fileInputClass} /></FormGroup><div className="space-y-3"><FormGroup><FormLabel htmlFor={`spot-title-${index}`}>Judul Spot</FormLabel><input id={`spot-title-${index}`} name="title" value={spot.title} onChange={e => handleSpotChange(index, e)} placeholder="Cth: Sudut Jendela Senja" className={inputClass} /></FormGroup><FormGroup><FormLabel htmlFor={`spot-tip-${index}`}>Tips Foto</FormLabel><input id={`spot-tip-${index}`} name="tip" value={spot.tip} onChange={e => handleSpotChange(index, e)} placeholder="Cth: Ambil foto saat sore hari" className={inputClass} /></FormGroup></div></div></div>))}{formData.spots.length === 0 && <p className="text-muted text-center py-4">Belum ada spot foto. Klik tombol di bawah untuk menambahkan.</p>}</div><button type="button" onClick={handleAddSpot} className="mt-4 w-full bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 font-semibold py-2 rounded-lg">+ Tambah Spot Foto</button></fieldset> </div> )}
                    {step === 5 && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 5: Events & Promo</h3> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Manajemen Event</legend><div className="space-y-4 max-h-80 overflow-y-auto pr-2">{formData.events.map((event, index) => (<div key={event.id} className="border p-4 rounded-lg bg-soft dark:bg-gray-900/50 relative"><button type="button" onClick={() => handleRemoveEvent(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-500/20 rounded-full h-7 w-7 flex items-center justify-center font-bold text-xl hover:bg-red-500 hover:text-white">&times;</button><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormGroup className="space-y-3"><FormLabel htmlFor={`event-name-${index}`}>Nama Event</FormLabel><input id={`event-name-${index}`} name="name" value={event.name} onChange={e => handleEventChange(index, e)} placeholder="Cth: Live Music Akustik" className={inputClass} required/><FormLabel htmlFor={`event-desc-${index}`}>Deskripsi</FormLabel><textarea id={`event-desc-${index}`} name="description" value={event.description} onChange={e => handleEventChange(index, e)} placeholder="Detail event" className={`${inputClass} h-20`}></textarea></FormGroup><div className="space-y-3"><FormGroup><FormLabel htmlFor={`event-photo-${index}`}>Gambar (Opsional)</FormLabel><ImageWithFallback src={eventPreviews[index] || event.imageUrl} alt="Event" className="w-full h-20 object-cover rounded-md mb-2" /><input id={`event-photo-${index}`} type="file" accept="image/*" onChange={e => handleEventFileChange(index, e)} className={fileInputClass} /></FormGroup><div className="flex gap-2"><FormGroup className="flex-1"><FormLabel htmlFor={`event-start-${index}`}>Tgl Mulai</FormLabel><input id={`event-start-${index}`} name="start_date" type="date" value={new Date(event.start_date).toISOString().split('T')[0]} onChange={e => handleEventChange(index, e)} className={inputClass} required/></FormGroup><FormGroup className="flex-1"><FormLabel htmlFor={`event-end-${index}`}>Tgl Selesai</FormLabel><input id={`event-end-${index}`} name="end_date" type="date" value={new Date(event.end_date).toISOString().split('T')[0]} onChange={e => handleEventChange(index, e)} className={inputClass} required/></FormGroup></div></div></div></div>))}{formData.events.length === 0 && <p className="text-muted text-center py-4">Belum ada event. Klik tombol di bawah untuk menambahkan.</p>}</div><button type="button" onClick={handleAddEvent} className="mt-4 w-full bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 font-semibold py-2 rounded-lg">+ Tambah Event</button></fieldset> </div> )}
                    {step === 6 && isAdmin && ( <div className="space-y-6 animate-fade-in-up"> <h3 className="font-bold text-xl mb-2">Langkah 6: Sponsorship</h3> <fieldset className={fieldsetStyles}><legend className={legendStyles}>Detail Sponsorship (Admin Only)</legend><div className="flex items-center gap-4"><input type="checkbox" id="isSponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" /><label htmlFor="isSponsored" className="font-medium text-primary">Aktifkan Sponsorship</label></div>{formData.isSponsored && (<div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><FormGroup><FormLabel htmlFor="sponsoredRank">Ranking Sponsor</FormLabel><input id="sponsoredRank" name="sponsoredRank" type="number" value={formData.sponsoredRank} onChange={handleChange} placeholder="Urutan (cth: 1)" className={inputClass} /><FormHelperText>Angka lebih kecil tampil lebih dulu.</FormHelperText></FormGroup><FormGroup><FormLabel htmlFor="sponsoredUntil">Sponsor Hingga</FormLabel><input id="sponsoredUntil" name="sponsoredUntil" type="date" value={formData.sponsoredUntil} onChange={handleChange} className={inputClass} /></FormGroup></div>)}</fieldset> </div> )}
                </form>
                <div className="p-6 flex justify-between gap-4 border-t border-border mt-auto">
                    <button type="button" onClick={step === 1 ? onCancel : prevStep} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 rounded-xl font-semibold"> {step === 1 ? 'Batal' : 'Kembali'} </button>
                    {step < formSteps.length ? ( <button type="button" onClick={nextStep} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90"> Lanjut </button> ) : ( <button type="submit" onClick={handleSubmit} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 disabled:bg-brand/50" disabled={isSaving || isUploading}> {isUploading ? 'Uploading...' : (isSaving ? 'Menyimpan...' : 'Simpan')} </button> )}
                </div>
            </div>
        </div>
    );
};

export default AdminCafeForm;