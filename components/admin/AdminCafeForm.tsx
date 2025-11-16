
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Cafe, Amenity, Vibe, Spot } from '../../types';
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

const MultiStepProgressBar: React.FC<{ steps: string[], currentStep: number }> = ({ steps, currentStep }) => (
    <div className="flex items-start justify-between">
        {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = currentStep > stepIndex;
            const isActive = currentStep === stepIndex;

            return (
                <React.Fragment key={step}>
                    <div className="flex flex-col items-center text-center px-1">
                        <div
                            className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-lg transition-all duration-300 ${
                                isCompleted ? 'bg-brand text-white' : isActive ? 'bg-brand/20 text-brand border-2 border-brand' : 'bg-gray-200 dark:bg-gray-700 text-muted'
                            }`}
                        >
                            {isCompleted ? '✓' : stepIndex}
                        </div>
                        <p className={`mt-2 text-[10px] sm:text-xs font-semibold w-16 sm:w-20 ${isActive || isCompleted ? 'text-primary dark:text-white' : 'text-muted'}`}>{step}</p>
                    </div>
                    {stepIndex < steps.length && (
                        <div className={`flex-1 h-1 mt-5 transition-all duration-300 ${isCompleted ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
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
        name: cafe?.name || '', description: cafe?.description || '', address: cafe?.address || '', city: cafe?.city || SOUTH_SUMATRA_CITIES[0], district: cafe?.district || '',
        priceTier: cafe?.priceTier || PriceTier.STANDARD, logoUrl: cafe?.logoUrl || '', coverUrl: cafe?.coverUrl || '',
        openingTime: initialHoursState.openingTime, closingTime: initialHoursState.closingTime, is24Hours: initialHoursState.is24Hours,
        lat: cafe?.coords?.lat?.toString() ?? '', lng: cafe?.coords?.lng?.toString() ?? '',
        isSponsored: cafe?.isSponsored || false, sponsoredUntil: cafe?.sponsoredUntil ? new Date(cafe.sponsoredUntil).toISOString().split('T')[0] : '',
        sponsoredRank: cafe?.sponsoredRank || 0, vibes: cafe?.vibes || [], amenities: cafe?.amenities || [], spots: cafe?.spots || [],
    });
    
    const [coordsInput, setCoordsInput] = useState(
      () => (cafe?.coords?.lat && cafe?.coords?.lng ? `${cafe.coords.lat}, ${cafe.coords.lng}` : '')
    );
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [spotFiles, setSpotFiles] = useState<(File | null)[]>(cafe?.spots.map(() => null) || []);
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [coverPreview, setCoverPreview] = useState<string | null>(null);
    const [spotPreviews, setSpotPreviews] = useState<(string | null)[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [isGeocoding, setIsGeocoding] = useState(false);
    const geocodeTimeoutRef = useRef<number | null>(null);


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
    
    const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { value } = e.target;
        setCoordsInput(value); // Update the input field immediately

        // Regex to find two numbers (integer or float, possibly negative) separated by a comma and/or spaces.
        const coordRegex = /^\s*(-?\d{1,3}(?:\.\d+)?)\s*[, ]+\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;
        const match = value.match(coordRegex);

        if (match) {
            const lat = parseFloat(match[1]);
            const lng = parseFloat(match[2]);
            // A basic sanity check for valid coordinate ranges
            if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                setFormData(prev => ({
                    ...prev,
                    lat: String(lat),
                    lng: String(lng)
                }));
            }
        } else {
            // If the format is invalid, clear the actual lat/lng data
            // The useEffect for geocoding won't run with empty strings
            setFormData(prev => ({ ...prev, lat: '', lng: ''}));
        }
    };

    const handleReverseGeocode = useCallback(() => {
        if (geocodeTimeoutRef.current) {
            clearTimeout(geocodeTimeoutRef.current);
        }

        geocodeTimeoutRef.current = window.setTimeout(async () => {
            const lat = parseFloat(String(formData.lat));
            const lng = parseFloat(String(formData.lng));

            if (isNaN(lat) || isNaN(lng)) return;

            setIsGeocoding(true);
            try {
                const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
                if (!response.ok) throw new Error('Geocoding service failed.');
                
                const data = await response.json();
                if (data.error) throw new Error(data.error);

                const { address } = data;
                const fullAddress = data.display_name || '';
                const city = address.city || address.town || address.village;
                const district = address.suburb || address.city_district;

                setFormData(prev => ({
                    ...prev,
                    address: fullAddress,
                    ...(city && { city: city }),
                    ...(district && { district: district }),
                }));
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
        if (formData.lat.trim() && formData.lng.trim()) {
            handleReverseGeocode();
        }
    }, [formData.lat, formData.lng, handleReverseGeocode]);


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
                const lat = parseFloat(String(formData.lat));
                const lng = parseFloat(String(formData.lng));
                if (isNaN(lat) || isNaN(lng)) {
                    setNotification({ message: 'Koordinat Peta wajib diisi dengan format yang benar (misal: -2.9, 104.7).', type: 'error' });
                    return false;
                }
                break;
            case 2:
                if (!coverFile && !formData.coverUrl) {
                    setNotification({ message: 'Cover Image wajib diunggah.', type: 'error' });
                    return false;
                }
                break;
            default:
                break;
        }
        setNotification(null); // Clear previous validation errors
        return true;
    };
    
    const validateAllSteps = (): boolean => {
        // Step 1 validation
        if (!formData.name.trim() || !formData.address.trim()) {
            setNotification({ message: 'Nama Kafe dan Alamat wajib diisi.', type: 'error' });
            setStep(1);
            return false;
        }
        const lat = parseFloat(String(formData.lat));
        const lng = parseFloat(String(formData.lng));
        if (isNaN(lat) || isNaN(lng)) {
            setNotification({ message: 'Koordinat Peta wajib diisi dengan format yang benar (misal: -2.9, 104.7).', type: 'error' });
            setStep(1);
            return false;
        }

        // Step 2 validation
        if (!coverFile && !formData.coverUrl) {
            setNotification({ message: 'Cover Image wajib diunggah.', type: 'error' });
            setStep(2);
            return false;
        }

        setNotification(null);
        return true;
    };


    const nextStep = () => {
        if (validateStep(step)) {
            setStep(s => Math.min(s + 1, formSteps.length));
        }
    };
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
        if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && step < formSteps.length) {
            e.preventDefault();
            nextStep();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateAllSteps()) return;

        setIsSaving(true);
        
        try {
            setIsUploading(true);
            let finalLogoUrl = formData.logoUrl;
            if (logoFile) {
                finalLogoUrl = await cloudinaryService.uploadImage(await fileToBase64(logoFile));
            }

            let finalCoverUrl = formData.coverUrl;
            if (coverFile) {
                finalCoverUrl = await cloudinaryService.uploadImage(await fileToBase64(coverFile));
            }

            const processedSpots = await Promise.all(
                formData.spots.map(async (spot, index) => {
                    const spotFile = spotFiles[index];
                    let uploadedPhotoUrl: string | null = null;
                    if (spotFile) {
                        uploadedPhotoUrl = await cloudinaryService.uploadImage(await fileToBase64(spotFile));
                    }
                    const finalPhotoUrl = uploadedPhotoUrl || spot.photoUrl;
                    return {
                        id: spot.id,
                        title: spot.title,
                        tip: spot.tip,
                        photoUrl: finalPhotoUrl,
                    };
                })
            );
            setIsUploading(false);

            const finalSpots = processedSpots.filter(s => s.photoUrl || (s.title && s.title.trim()));

            const finalOpeningHours = formData.is24Hours ? '24 Jam' : `${formData.openingTime} - ${formData.closingTime}`;

            const dataToSave: Partial<Cafe> = {
                name: formData.name, description: formData.description, address: formData.address, city: formData.city, district: formData.district,
                openingHours: finalOpeningHours, priceTier: Number(formData.priceTier),
                coords: { 
                    lat: parseFloat(parseFloat(String(formData.lat)).toFixed(2)), 
                    lng: parseFloat(parseFloat(String(formData.lng)).toFixed(2)) 
                },
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
    const fieldsetStyles = "border border-border p-4 rounded-xl space-y-4";
    const legendStyles = "font-semibold px-2 text-primary";
    const totalSaving = isSaving || isUploading;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in-up" onClick={onCancel}>
            <div className="bg-card rounded-3xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-8 border-b border-border">
                    <h2 className="text-2xl font-bold font-jakarta text-primary text-center mb-4">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                    <MultiStepProgressBar steps={formSteps} currentStep={step} />
                </div>
                
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-4 sm:p-8 space-y-6 overflow-y-auto">
                    {step === 1 && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h3 className="font-bold text-xl mb-2">Langkah 1: Informasi Dasar</h3>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Identitas Kafe</legend>
                                <FormGroup>
                                    <FormLabel htmlFor="name">Nama Cafe</FormLabel>
                                    <input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Kopi Senja" className={inputClass} required />
                                </FormGroup>
                                <FormGroup>
                                    <FormLabel htmlFor="description">Deskripsi</FormLabel>
                                    <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Jelaskan keunikan dari cafe ini..." className={`${inputClass} h-24`} />
                                    <FormHelperText>Tulis deskripsi singkat atau biarkan AI yang membuatnya.</FormHelperText>
                                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="mt-2 w-full bg-accent-cyan/10 text-accent-cyan dark:bg-accent-cyan/20 font-semibold py-2 rounded-lg hover:bg-accent-cyan/20 dark:hover:bg-accent-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                        {isGeneratingDesc ? 'Generating...' : '✨ Generate Deskripsi dengan AI'}
                                    </button>
                                </FormGroup>
                            </fieldset>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Lokasi</legend>
                                 <FormGroup>
                                    <FormLabel htmlFor="coords">Koordinat Peta</FormLabel>
                                    <input
                                        id="coords"
                                        name="coords"
                                        type="text"
                                        value={coordsInput}
                                        onChange={handleCoordsChange}
                                        placeholder="-2.9760, 104.7458"
                                        className={inputClass}
                                        required
                                    />
                                    <FormHelperText>Salin & tempel koordinat dari Google Maps. Alamat, kota, dan kecamatan akan terisi otomatis.</FormHelperText>
                                </FormGroup>
                                <FormGroup>
                                    <FormLabel htmlFor="address">Alamat (Otomatis)</FormLabel>
                                    <div className="relative">
                                        <input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Menunggu koordinat..." className={`${inputClass} pr-10`} required />
                                        {isGeocoding && (
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-brand"></div>
                                            </div>
                                        )}
                                    </div>
                                </FormGroup>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormGroup>
                                        <FormLabel htmlFor="city">Kota/Kabupaten</FormLabel>
                                        <select id="city" name="city" value={formData.city} onChange={handleChange} className={inputClass}>
                                            {SOUTH_SUMATRA_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </FormGroup>
                                    <FormGroup>
                                        <FormLabel htmlFor="district">Kecamatan</FormLabel>
                                        <input id="district" name="district" value={formData.district} onChange={handleChange} placeholder="e.g., Ilir Barat I" className={inputClass} />
                                    </FormGroup>
                                 </div>
                            </fieldset>
                        </div>
                    )}

                    {step === 2 && (
                         <div className="space-y-6 animate-fade-in-up">
                            <h3 className="font-bold text-xl mb-2">Langkah 2: Detail Operasional</h3>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Jam Operasional</legend>
                                <div className="flex items-center gap-4">
                                    <input type="checkbox" id="is24Hours" name="is24Hours" checked={formData.is24Hours} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" />
                                    <label htmlFor="is24Hours" className="font-medium text-primary cursor-pointer">Buka 24 Jam</label>
                                </div>
                                {!formData.is24Hours && (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormGroup><FormLabel htmlFor="openingTime">Jam Buka</FormLabel><input id="openingTime" name="openingTime" type="time" value={formData.openingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></FormGroup>
                                        <FormGroup><FormLabel htmlFor="closingTime">Jam Tutup</FormLabel><input id="closingTime" name="closingTime" type="time" value={formData.closingTime} onChange={handleChange} className={inputClass} required={!formData.is24Hours} /></FormGroup>
                                    </div>
                                )}
                            </fieldset>
                            <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Detail Lainnya</legend>
                                <FormGroup>
                                    <FormLabel htmlFor="priceTier">Kisaran Harga</FormLabel>
                                    <select id="priceTier" name="priceTier" value={formData.priceTier} onChange={handleChange} className={inputClass}>
                                        <option value={PriceTier.BUDGET}>Budget ($)</option><option value={PriceTier.STANDARD}>Standard ($$)</option><option value={PriceTier.PREMIUM}>Premium ($$$)</option><option value={PriceTier.LUXURY}>Luxury ($$$$)</option>
                                    </select>
                                </FormGroup>
                            </fieldset>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Gambar</legend>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <FormGroup>
                                        <FormLabel htmlFor="logo">Logo (Opsional)</FormLabel>
                                        <ImageWithFallback src={logoPreview || formData.logoUrl} alt="Logo" className="w-24 h-24 object-contain rounded-xl mb-2 bg-soft border border-border p-1" fallbackText="Unggah Logo"/>
                                        <input id="logo" type="file" accept="image/*" onChange={handleLogoFileChange} className={fileInputClass} />
                                    </FormGroup>
                                    <FormGroup>
                                        <FormLabel htmlFor="cover">Cover Image (Wajib)</FormLabel>
                                        <ImageWithFallback src={coverPreview || formData.coverUrl} defaultSrc={DEFAULT_COVER_URL} alt="Cover" className="w-full h-24 object-cover rounded-xl mb-2" />
                                        <input id="cover" type="file" accept="image/*" onChange={handleCoverFileChange} className={fileInputClass} />
                                    </FormGroup>
                                 </div>
                             </fieldset>
                         </div>
                    )}
                    
                    {step === 3 && (
                         <div className="space-y-6 animate-fade-in-up">
                             <h3 className="font-bold text-xl mb-2">Langkah 3: Vibe & Fasilitas</h3>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Pilih Vibe yang Sesuai</legend>
                                <div className="flex flex-wrap gap-3">
                                    {VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-4 py-2 rounded-full border-2 transition-colors font-semibold ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 hover:text-brand'}`}>{v.name}</button>)}
                                </div>
                             </fieldset>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Pilih Fasilitas yang Tersedia</legend>
                                <div className="flex flex-wrap gap-3">
                                    {AMENITIES.map(a => <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`px-4 py-2 rounded-full border-2 transition-colors font-semibold ${formData.amenities.some(fa => fa.id === a.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 hover:text-brand'}`}>{a.icon} {a.name}</button>)}
                                </div>
                             </fieldset>
                         </div>
                    )}

                    {step === 4 && (
                         <div className="space-y-6 animate-fade-in-up">
                             <h3 className="font-bold text-xl mb-2">Langkah 4: Spot Foto</h3>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Galeri Spot Foto</legend>
                                <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                                    {formData.spots.map((spot, index) => (
                                        <div key={spot.id} className="border border-border p-4 rounded-lg bg-soft dark:bg-gray-900/50 relative">
                                            <button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 rounded-full h-7 w-7 flex items-center justify-center font-bold text-xl leading-none hover:bg-red-500 hover:text-white dark:hover:bg-red-400 dark:hover:text-white transition-all">&times;</button>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <FormGroup>
                                                    <FormLabel htmlFor={`spot-photo-${index}`}>Foto Spot</FormLabel>
                                                    <ImageWithFallback src={spotPreviews[index] || spot.photoUrl} alt="Spot" className="w-full h-32 object-cover rounded-md mb-2" />
                                                    <input id={`spot-photo-${index}`} type="file" accept="image/*" onChange={e => handleSpotFileChange(index, e)} className={fileInputClass} />
                                                </FormGroup>
                                                <div className="space-y-3">
                                                    <FormGroup>
                                                        <FormLabel htmlFor={`spot-title-${index}`}>Judul Spot</FormLabel>
                                                        <input id={`spot-title-${index}`} name="title" value={spot.title} onChange={e => handleSpotChange(index, e)} placeholder="Cth: Sudut Jendela Senja" className={inputClass} />
                                                    </FormGroup>
                                                    <FormGroup>
                                                        <FormLabel htmlFor={`spot-tip-${index}`}>Tips Foto</FormLabel>
                                                        <input id={`spot-tip-${index}`} name="tip" value={spot.tip} onChange={e => handleSpotChange(index, e)} placeholder="Cth: Ambil foto saat sore hari" className={inputClass} />
                                                    </FormGroup>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddSpot} className="mt-4 w-full bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold py-2 rounded-lg transition-all">+ Tambah Spot Foto</button>
                            </fieldset>
                         </div>
                    )}

                    {step === 5 && isAdmin && (
                         <div className="space-y-6 animate-fade-in-up">
                            <h3 className="font-bold text-xl mb-2">Langkah 5: Sponsorship</h3>
                             <fieldset className={fieldsetStyles}>
                                <legend className={legendStyles}>Detail Sponsorship (Admin Only)</legend>
                                <div className="flex items-center gap-4">
                                    <input type="checkbox" id="isSponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" />
                                    <label htmlFor="isSponsored" className="font-medium text-primary cursor-pointer">Aktifkan Sponsorship</label>
                                </div>
                                {formData.isSponsored && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormGroup>
                                        <FormLabel htmlFor="sponsoredRank">Ranking Sponsor</FormLabel>
                                        <input id="sponsoredRank" name="sponsoredRank" type="number" value={formData.sponsoredRank} onChange={handleChange} placeholder="Urutan (cth: 1)" className={inputClass} />
                                        <FormHelperText>Angka lebih kecil tampil lebih dulu.</FormHelperText>
                                    </FormGroup>
                                    <FormGroup>
                                        <FormLabel htmlFor="sponsoredUntil">Sponsor Hingga</FormLabel>
                                        <input id="sponsoredUntil" name="sponsoredUntil" type="date" value={formData.sponsoredUntil} onChange={handleChange} className={inputClass} />
                                    </FormGroup>
                                </div>
                                )}
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
                        <button type="submit" onClick={handleSubmit} className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:bg-brand/50" disabled={totalSaving}>
                            {isUploading ? 'Uploading...' : (isSaving ? 'Menyimpan...' : 'Simpan')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminCafeForm;
