import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Cafe, Amenity, Vibe } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { AMENITIES, VIBES, SOUTH_SUMATRA_CITIES } from '../../constants';
import { PriceTier } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import { CafeContext } from '../../context/CafeContext';
import ConfirmationModal from '../common/ConfirmationModal';
import { 
    XMarkIcon, PhotoIcon, MapPinIcon, ClockIcon,
    IdentificationIcon, DocumentTextIcon, SparklesIcon, PhoneIcon, GlobeAltIcon,
    MapIcon, WifiIcon, CameraIcon,
    TicketIcon, LinkIcon, PlusIcon, TrashIcon, CloudArrowUpIcon, ArrowRightIcon
} from '@heroicons/react/24/solid';

interface AdminCafeFormProps {
    cafe?: Cafe | null;
    onSave: (cafe: any) => Promise<{ data: any, error: any }>;
    onCancel: () => void;
    userRole: 'admin' | 'user' | 'admin_cafe';
    setNotification: (notification: { message: string, type: 'success' | 'error' } | null) => void;
    onSuccess: () => void;
}

// Declare the global OLC object
declare const OpenLocationCode: any;

// --- REUSABLE MODERN COMPONENTS ---

const ModernInput = ({ label, icon, ...props }: any) => (
    <div className="group">
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
            {icon && <span className="text-brand">{icon}</span>}
            {label}
        </label>
        <input 
            className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-200 outline-none font-medium shadow-sm"
            {...props} 
        />
    </div>
);

const ModernSelect = ({ label, icon, children, ...props }: any) => (
    <div className="group">
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5">
            {icon && <span className="text-brand">{icon}</span>}
            {label}
        </label>
        <div className="relative">
            <select 
                className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-primary dark:text-white focus:ring-2 focus:ring-brand/50 focus:border-brand transition-all duration-200 outline-none font-medium appearance-none cursor-pointer shadow-sm"
                {...props} 
            >
                {children}
            </select>
            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-muted">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
            </div>
        </div>
    </div>
);

const ImageUploader = ({ label, preview, onChange, onRemove }: any) => (
    <div className="w-full">
        <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5 ml-1">{label}</label>
        <div className="relative group w-full aspect-video sm:aspect-[4/3] rounded-3xl overflow-hidden bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-700 hover:border-brand/50 transition-all cursor-pointer">
            {preview ? (
                <>
                    <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <label className="p-3 bg-white/20 hover:bg-white/40 rounded-full text-white cursor-pointer backdrop-blur-sm transition-colors shadow-lg">
                            <CameraIcon className="h-6 w-6" />
                            <input type="file" accept="image/*" onChange={onChange} className="hidden" />
                        </label>
                        {onRemove && (
                            <button type="button" onClick={onRemove} className="p-3 bg-red-500/80 hover:bg-red-600 rounded-full text-white backdrop-blur-sm transition-colors shadow-lg">
                                <TrashIcon className="h-6 w-6" />
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <label className="absolute inset-0 flex flex-col items-center justify-center text-muted hover:text-brand cursor-pointer">
                    <div className="p-4 rounded-full bg-white dark:bg-gray-700 shadow-sm mb-3 group-hover:scale-110 transition-transform duration-300">
                        <CloudArrowUpIcon className="h-8 w-8" />
                    </div>
                    <span className="text-xs font-bold">Klik untuk Upload</span>
                    <input type="file" accept="image/*" onChange={onChange} className="hidden" />
                </label>
            )}
        </div>
    </div>
);

// --- MAIN COMPONENT ---

const AdminCafeForm: React.FC<AdminCafeFormProps> = ({ cafe, onSave, onCancel, userRole, setNotification, onSuccess }) => {
    const { updateCafe } = useContext(CafeContext)!;
    
    const [step, setStep] = useState(1);
    const isAdmin = userRole === 'admin';
    const isEditMode = !!cafe;

    const formSteps = isEditMode 
        ? (isAdmin 
            ? ['Info Utama', 'Operasional', 'Visual & Fasilitas', 'Spot Foto', 'Sponsor'] 
            : ['Info Utama', 'Operasional', 'Visual & Fasilitas', 'Spot Foto', 'Events'])
        : ['Info Utama', 'Operasional', 'Visual & Fasilitas'];

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
        phoneNumber: cafe?.phoneNumber || '', websiteUrl: cafe?.websiteUrl || '',
        priceTier: cafe?.priceTier || PriceTier.STANDARD, logoUrl: cafe?.logoUrl || '', 
        coverUrl: cafe?.coverUrl || '', 
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
    const [logoPreview, setLogoPreview] = useState<string | null>(cafe?.logoUrl || null);
    const [coverPreview, setCoverPreview] = useState<string | null>(cafe?.coverUrl || null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const geocodeTimeoutRef = useRef<number | null>(null);
    const [isDirty, setIsDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [locationInputType, setLocationInputType] = useState<'coords' | 'mapsLink'>('coords');
    const [mapsLinkInput, setMapsLinkInput] = useState('');

    // File preview effects
    useEffect(() => { if (logoFile) { const o = URL.createObjectURL(logoFile); setLogoPreview(o); return () => URL.revokeObjectURL(o); } }, [logoFile]);
    useEffect(() => { if (coverFile) { const o = URL.createObjectURL(coverFile); setCoverPreview(o); return () => URL.revokeObjectURL(o); } }, [coverFile]);

    const markDirty = () => { if (!isDirty) setIsDirty(true); };

    const handleAttemptClose = () => {
        if (isDirty) {
            setShowExitConfirm(true);
        } else {
            onCancel();
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        markDirty();
        const { name, value, type } = e.target;
        setFormData(prev => ({...prev, [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value}));
    };
    
    const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        markDirty();
        const { value } = e.target;
        setCoordsInput(value);
        const match = value.match(/^\s*(-?\d{1,3}(?:\.\d+)?)\s*[, ]+\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
        if (match) {
            setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] }));
        }
    };

    // --- GEOCODING LOGIC START ---
    const handleReverseGeocode = useCallback(() => {
        if (isEditMode) return;
        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        geocodeTimeoutRef.current = window.setTimeout(async () => {
            const [lat, lng] = [parseFloat(String(formData.lat)), parseFloat(String(formData.lng))];
            if (isNaN(lat) || isNaN(lng)) return;
            setIsGeocoding(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
                if (!res.ok) throw new Error('API Error');
                const data = await res.json();
                if (data.error) throw new Error(data.error);
                setFormData(prev => ({ ...prev, address: data.display_name || '', city: data.address.city || data.address.county || '', district: data.address.suburb || data.address.town || '' }));
            } catch (error) {
                // Silent fail or simple log
                console.warn("Geocoding failed");
            } finally {
                setIsGeocoding(false);
            }
        }, 800);
    }, [formData.lat, formData.lng, isEditMode]);
    
    useEffect(() => { if (formData.lat && formData.lng) handleReverseGeocode(); }, [formData.lat, formData.lng, handleReverseGeocode]);

    const handleMapsLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        markDirty();
        setMapsLinkInput(e.target.value);
        // Simplified regex logic for brevity
        const latLngRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const match = e.target.value.match(latLngRegex);
        if (match) {
            setCoordsInput(`${match[1]}, ${match[2]}`);
            setFormData(prev => ({ ...prev, lat: match[1], lng: match[2] }));
        }
    };
    // --- GEOCODING LOGIC END ---

    const handleMultiSelectChange = (field: 'vibes' | 'amenities', item: Vibe | Amenity) => {
        markDirty();
        setFormData(prev => ({...prev, [field]: (prev[field] as any[]).some(i => i.id === item.id) ? (prev[field] as any[]).filter(i => i.id !== item.id) : [...prev[field], item]}));
    };

    // ... (Spot/Event Handlers kept mostly same logic, updated UI below)
    const handleAddSpot = () => {
        markDirty();
        setFormData(prev => ({ ...prev, spots: [...prev.spots, { id: `spot-${crypto.randomUUID()}`, title: '', tip: '', photoUrl: '' }] }));
        setSpotFiles(prev => [...prev, null]);
    };
    const handleRemoveSpot = (index: number) => {
        markDirty();
        setFormData(prev => ({ ...prev, spots: prev.spots.filter((_, i) => i !== index) }));
        setSpotFiles(prev => prev.filter((_, i) => i !== index));
    };
    const handleSpotChange = (index: number, field: string, value: string) => {
        markDirty();
        const newSpots = [...formData.spots];
        (newSpots[index] as any)[field] = value;
        setFormData(prev => ({ ...prev, spots: newSpots }));
    };
    const handleSpotFile = (index: number, file: File | null) => {
        if(file) { markDirty(); const f = [...spotFiles]; f[index] = file; setSpotFiles(f); }
    };

    // Validation & Submit Logic (Simplified for display)
    const validateStep = (s: number) => {
        if (s === 1) {
            if (!formData.name.trim()) return { isValid: false, message: 'Nama Kafe wajib diisi.' };
            if (!formData.lat || !formData.lng) return { isValid: false, message: 'Koordinat lokasi wajib diisi.' };
        }
        if (s === 3 && !coverFile && !formData.coverUrl) return { isValid: false, message: 'Foto Cover wajib diunggah.' };
        return { isValid: true, message: null };
    };

    const nextStep = () => {
        const { isValid, message } = validateStep(step);
        if (isValid) { setNotification(null); setStep(s => Math.min(s + 1, formSteps.length)); } 
        else { setNotification({ message: message!, type: 'error' }); }
    };

    // Submit Handler (Keeping robust logic from original)
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        const { isValid, message } = validateStep(step);
        if (!isValid) { setNotification({ message: message!, type: 'error' }); return; }

        setIsSaving(true);
        try {
            // 1. Save Data
            const payload = { ...formData, openingHours: formData.is24Hours ? '24 Jam' : `${formData.openingTime} - ${formData.closingTime}` };
            const { data: savedCafe, error } = await onSave(payload);
            if (error) throw error;

            // 2. Upload Images
            if (logoFile || coverFile || spotFiles.some(f => f)) {
                setIsUploading(true);
                const logoUrl = logoFile ? await cloudinaryService.uploadImage(await fileToBase64(logoFile)) : undefined;
                const coverUrl = coverFile ? await cloudinaryService.uploadImage(await fileToBase64(coverFile)) : undefined;
                
                const spotUrls = await Promise.all(formData.spots.map(async (spot, i) => 
                    spotFiles[i] ? await cloudinaryService.uploadImage(await fileToBase64(spotFiles[i]!)) : spot.photoUrl
                ));

                const updates: any = {};
                if (logoUrl) updates.logoUrl = logoUrl;
                if (coverUrl) updates.coverUrl = coverUrl;
                if (spotFiles.some(f => f)) updates.spots = formData.spots.map((s, i) => ({...s, photoUrl: spotUrls[i]}));
                
                if(Object.keys(updates).length > 0) await updateCafe(savedCafe.id, updates);
            }
            onSuccess();
        } catch (error: any) {
            setNotification({ message: `Gagal: ${error.message}`, type: 'error' });
        } finally {
            setIsSaving(false); setIsUploading(false);
        }
    };

    return (
        <>
        {/* FULLSCREEN CONTAINER - Z-2000 to cover sidebar (Z-50) and header */}
        <div className="fixed inset-0 z-[2000] bg-soft dark:bg-gray-950 flex flex-col animate-fade-in-up h-full w-full">
            
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-border px-4 sm:px-8 py-4 flex justify-between items-center shadow-sm z-20 h-18">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={handleAttemptClose}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-muted transition-colors"
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold font-jakarta text-primary dark:text-white leading-tight">
                            {cafe ? 'Edit Kafe' : 'Input Kafe Baru'}
                        </h2>
                        <p className="text-xs text-muted hidden sm:block">
                            Langkah {step} dari {formSteps.length}: <span className="font-bold text-brand">{formSteps[step-1]}</span>
                        </p>
                    </div>
                </div>
                
                {/* Progress Bar - Mobile Compact */}
                <div className="flex flex-col items-end gap-1 sm:hidden">
                    <span className="text-xs font-bold text-brand">{step}/{formSteps.length}</span>
                    <div className="w-20 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-brand transition-all duration-300" style={{ width: `${(step / formSteps.length) * 100}%` }}></div>
                    </div>
                </div>

                {/* Progress Bar - Desktop Wide */}
                <div className="hidden sm:block w-1/3 max-w-xs h-2.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className="h-full bg-brand transition-all duration-300" style={{ width: `${(step / formSteps.length) * 100}%` }}></div>
                </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto w-full relative custom-scrollbar bg-gray-50/50 dark:bg-black/20">
                {/* Constrained Width Container for better UX on wide screens */}
                <form id="cafe-form" onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto p-4 sm:p-8 space-y-8 pb-32">
                    
                    {/* Step 1: Info Utama */}
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-border space-y-6 shadow-sm">
                                <ModernInput label="Nama Kafe" icon={<IdentificationIcon className="h-4 w-4"/>} name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Kopi Senja" autoFocus />
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <ModernInput label="No. Telepon" icon={<PhoneIcon className="h-4 w-4"/>} name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="0812..." />
                                    <ModernInput label="Website / Sosmed" icon={<GlobeAltIcon className="h-4 w-4"/>} name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="instagram.com/..." />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-border space-y-4 shadow-sm">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="font-bold text-sm text-brand flex items-center gap-2"><MapIcon className="h-4 w-4"/> Lokasi</h4>
                                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                                        <button type="button" onClick={() => setLocationInputType('coords')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${locationInputType === 'coords' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-muted'}`}>Koordinat</button>
                                        <button type="button" onClick={() => setLocationInputType('mapsLink')} className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${locationInputType === 'mapsLink' ? 'bg-white dark:bg-gray-600 shadow-sm text-brand' : 'text-muted'}`}>Maps Link</button>
                                    </div>
                                </div>
                                
                                {locationInputType === 'coords' ? (
                                    <ModernInput label="Koordinat (Lat, Lng)" value={coordsInput} onChange={handleCoordsChange} placeholder="-2.9760, 104.7458" />
                                ) : (
                                    <ModernInput label="Link Google Maps" value={mapsLinkInput} onChange={handleMapsLinkChange} placeholder="Paste link disini..." />
                                )}

                                <div className="relative">
                                    <ModernInput label="Alamat Lengkap" icon={<MapPinIcon className="h-4 w-4"/>} name="address" value={formData.address} onChange={handleChange} placeholder={isGeocoding ? "Mencari alamat..." : "Alamat..."} />
                                    {isGeocoding && <div className="absolute right-3 top-9 w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin"></div>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <ModernSelect label="Kota" name="city" value={formData.city} onChange={handleChange}>
                                        {SOUTH_SUMATRA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </ModernSelect>
                                    <ModernInput label="Kecamatan" name="district" value={formData.district} onChange={handleChange} />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-border shadow-sm">
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-1.5 ml-1 flex items-center gap-1.5"><DocumentTextIcon className="h-4 w-4 text-brand"/> Deskripsi</label>
                                <textarea name="description" value={formData.description} onChange={handleChange} className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-primary dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand/50 outline-none h-32 resize-none shadow-inner" placeholder="Ceritakan keunikan kafe ini..." />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Operasional */}
                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border shadow-sm">
                                <h4 className="font-bold text-base mb-4 flex items-center gap-2 text-primary dark:text-white"><ClockIcon className="h-5 w-5 text-brand"/> Jam Operasional</h4>
                                <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-2xl cursor-pointer border border-border mb-4 hover:border-brand/50 transition-colors">
                                    <input type="checkbox" checked={formData.is24Hours} onChange={(e) => setFormData(prev => ({...prev, is24Hours: e.target.checked}))} className="w-5 h-5 text-brand rounded-md focus:ring-brand" />
                                    <span className="font-bold text-sm text-primary dark:text-white">Buka 24 Jam</span>
                                </label>
                                
                                {!formData.is24Hours && (
                                    <div className="flex items-center gap-4">
                                        <div className="flex-1"><ModernInput type="time" label="Buka" name="openingTime" value={formData.openingTime} onChange={handleChange} /></div>
                                        <span className="text-muted font-bold mt-6">-</span>
                                        <div className="flex-1"><ModernInput type="time" label="Tutup" name="closingTime" value={formData.closingTime} onChange={handleChange} /></div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border shadow-sm">
                                <h4 className="font-bold text-base mb-4 flex items-center gap-2 text-primary dark:text-white"><TicketIcon className="h-5 w-5 text-green-500"/> Range Harga</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {[1, 2, 3, 4].map(tier => (
                                        <label key={tier} className={`cursor-pointer p-3 rounded-2xl border-2 text-center transition-all ${Number(formData.priceTier) === tier ? 'border-brand bg-brand/5 text-brand shadow-sm transform scale-105' : 'border-border bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-600'}`}>
                                            <input type="radio" name="priceTier" value={tier} checked={Number(formData.priceTier) === tier} onChange={handleChange} className="hidden" />
                                            <div className="text-lg font-bold">{'$'.repeat(tier)}</div>
                                            <div className="text-[10px] uppercase font-bold text-muted">{['Budget', 'Standard', 'Premium', 'Luxury'][tier-1]}</div>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Visual & Fasilitas */}
                    {step === 3 && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border shadow-sm space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <ImageUploader label="Logo Kafe" preview={logoPreview} onChange={(e: any) => { markDirty(); setLogoFile(e.target.files[0]); }} onRemove={logoPreview ? () => { setLogoFile(null); setLogoPreview(null); } : undefined} />
                                    <ImageUploader label="Foto Cover (Wajib)" preview={coverPreview} onChange={(e: any) => { markDirty(); setCoverFile(e.target.files[0]); }} onRemove={undefined} />
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border shadow-sm">
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-1.5"><SparklesIcon className="h-4 w-4 text-accent-pink"/> Vibes</label>
                                <div className="flex flex-wrap gap-2">
                                    {VIBES.map(v => (
                                        <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-4 py-2 rounded-full text-sm font-bold border transition-all ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-brand text-white border-brand shadow-md transform scale-105' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-muted hover:border-brand/30'}`}>
                                            {v.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-border shadow-sm">
                                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-3 ml-1 flex items-center gap-1.5"><WifiIcon className="h-4 w-4 text-blue-500"/> Fasilitas</label>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                    {AMENITIES.map(a => (
                                        <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${formData.amenities.some(fa => fa.id === a.id) ? 'bg-brand/5 border-brand text-brand shadow-sm transform scale-105' : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-muted hover:border-brand/30'}`}>
                                            <span className="text-xl">{a.icon}</span>
                                            <span className="text-[10px] font-bold">{a.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Spot Foto */}
                    {step === 4 && (
                        <div className="space-y-6 animate-fade-in-up">
                            {formData.spots.map((spot, i) => (
                                <div key={spot.id || i} className="bg-white dark:bg-gray-800 p-4 rounded-3xl border border-border relative group shadow-sm">
                                    <button type="button" onClick={() => handleRemoveSpot(i)} className="absolute top-2 right-2 p-2 bg-red-100 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200"><TrashIcon className="h-4 w-4"/></button>
                                    <div className="flex gap-4 items-start">
                                        <div className="w-24 h-24 flex-shrink-0">
                                            <ImageUploader label="" preview={spot.photoUrl ? spot.photoUrl : (spotFiles[i] ? URL.createObjectURL(spotFiles[i]!) : null)} onChange={(e: any) => handleSpotFile(i, e.target.files[0])} />
                                        </div>
                                        <div className="flex-grow space-y-3">
                                            <ModernInput placeholder="Nama Spot (e.g. Jendela Besar)" value={spot.title} onChange={(e: any) => handleSpotChange(i, 'title', e.target.value)} />
                                            <ModernInput placeholder="Tips Foto (Opsional)" value={spot.tip} onChange={(e: any) => handleSpotChange(i, 'tip', e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddSpot} className="w-full py-4 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 text-muted font-bold hover:border-brand hover:text-brand hover:bg-brand/5 transition-all flex items-center justify-center gap-2">
                                <PlusIcon className="h-6 w-6"/> Tambah Spot Foto
                            </button>
                        </div>
                    )}

                    {/* Step 5: Sponsor / Events */}
                    {step === 5 && (
                        <div className="animate-fade-in-up">
                            {isAdmin ? (
                                <div className="bg-yellow-50 dark:bg-yellow-900/10 p-6 rounded-3xl border border-yellow-100 dark:border-yellow-900/30">
                                    <label className="flex items-center gap-3 mb-6 cursor-pointer">
                                        <input type="checkbox" checked={formData.isSponsored} onChange={(e) => setFormData(prev => ({...prev, isSponsored: e.target.checked}))} className="w-6 h-6 text-yellow-500 rounded focus:ring-yellow-500" />
                                        <span className="font-bold text-lg text-yellow-800 dark:text-yellow-200">Aktifkan Sponsor</span>
                                    </label>
                                    {formData.isSponsored && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in-down">
                                            <ModernInput type="date" label="Berlaku Hingga" value={formData.sponsoredUntil} onChange={handleChange} name="sponsoredUntil" />
                                            <ModernInput type="number" label="Ranking Prioritas (1-10)" value={formData.sponsoredRank} onChange={handleChange} name="sponsoredRank" min="1" max="10" />
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="text-center text-muted py-10 bg-white dark:bg-gray-800 rounded-3xl border border-border">
                                    <p>Fitur manajemen Event akan segera hadir!</p>
                                </div>
                            )}
                        </div>
                    )}

                </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-border z-20 shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)]">
                <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-3 sm:py-5 flex items-center gap-3 sm:gap-4">
                    <button 
                        onClick={step === 1 ? handleAttemptClose : () => setStep(s => s - 1)} 
                        className="flex-1 sm:flex-none h-12 px-6 rounded-2xl font-bold text-muted hover:text-primary bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all active:scale-95 flex items-center justify-center" 
                        disabled={isSaving}
                    >
                        {step === 1 ? 'Batal' : 'Kembali'}
                    </button>
                    
                    {step < formSteps.length ? (
                        <button 
                            onClick={nextStep} 
                            className="flex-[2] sm:flex-none h-12 px-8 bg-brand text-white rounded-2xl font-bold shadow-lg shadow-brand/20 hover:bg-brand/90 hover:shadow-brand/30 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2"
                        >
                            Lanjut <ArrowRightIcon className="h-4 w-4 font-bold" strokeWidth={3} />
                        </button>
                    ) : (
                        <button 
                            onClick={handleSubmit} 
                            disabled={isSaving || isUploading} 
                            className="flex-[2] sm:flex-none h-12 px-8 bg-gradient-to-r from-brand to-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-brand/20 hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:transform-none"
                        >
                            {isUploading ? 'Mengupload...' : isSaving ? 'Menyimpan...' : 'Simpan Data'}
                        </button>
                    )}
                </div>
            </div>
        </div>
        
        {showExitConfirm && (
            <ConfirmationModal 
                title="Batal Edit?" 
                message="Perubahan yang belum disimpan akan hilang." 
                confirmText="Ya, Keluar" 
                cancelText="Lanjut Edit" 
                onConfirm={onCancel} 
                onCancel={() => setShowExitConfirm(false)} 
            />
        )}
        </>
    );
};

export default AdminCafeForm;