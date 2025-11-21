
import React, { useState, useEffect, useCallback, useRef, useContext } from 'react';
import { Cafe, Amenity, Vibe, Spot, Event } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { AMENITIES, VIBES, SOUTH_SUMATRA_CITIES } from '../../constants';
import { PriceTier } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import { CafeContext } from '../../context/CafeContext';
import ConfirmationModal from '../common/ConfirmationModal';
import { 
    TrashIcon, PlusIcon, XMarkIcon, PhotoIcon, MapPinIcon, ClockIcon, CurrencyDollarIcon,
    IdentificationIcon, DocumentTextIcon, SparklesIcon, PhoneIcon, GlobeAltIcon,
    MapIcon, BuildingOffice2Icon, WifiIcon, CameraIcon, LightBulbIcon,
    CalendarDaysIcon, TicketIcon, StarIcon, LinkIcon
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

const MultiStepProgressBar: React.FC<{ steps: string[], currentStep: number, onStepClick: (step: number) => void }> = ({ steps, currentStep, onStepClick }) => (
    <div className="flex items-start justify-between w-full px-2">
        {steps.map((step, index) => {
            const stepIndex = index + 1;
            const isCompleted = currentStep > stepIndex;
            const isActive = currentStep === stepIndex;

            return (
                <React.Fragment key={step}>
                    <button
                        type="button"
                        onClick={() => onStepClick(stepIndex)}
                        className="flex flex-col items-center text-center px-1 transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed group relative z-10"
                        aria-label={`Go to step ${stepIndex}: ${step}`}
                    >
                        <div
                            className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-sm sm:text-lg transition-all duration-300 group-hover:scale-110 ${
                                isCompleted ? 'bg-brand text-white' : isActive ? 'bg-brand/20 text-brand border-2 border-brand' : 'bg-gray-200 dark:bg-gray-700 text-muted'
                            }`}
                        >
                            {isCompleted ? '✓' : stepIndex}
                        </div>
                        <p className={`mt-2 text-[9px] sm:text-xs font-semibold max-w-[60px] sm:max-w-[80px] truncate ${isActive || isCompleted ? 'text-primary dark:text-white' : 'text-muted'}`}>{step}</p>
                    </button>
                    {stepIndex < steps.length && (
                        <div className={`flex-1 h-1 mt-4 sm:mt-5 mx-1 sm:mx-2 transition-all duration-300 rounded-full ${isCompleted || isActive ? 'bg-brand' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                    )}
                </React.Fragment>
            );
        })}
    </div>
);


const FormGroup: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={className}>{children}</div>
);

const FormLabel: React.FC<{ htmlFor: string, children: React.ReactNode, icon?: React.ReactNode }> = ({ htmlFor, children, icon }) => (
    <label htmlFor={htmlFor} className="font-semibold text-primary dark:text-gray-200 mb-2 text-sm sm:text-base flex items-center gap-2">
        {icon && <span className="text-brand">{icon}</span>}
        {children}
    </label>
);

const FormHelperText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-xs sm:text-sm text-muted mt-1">{children}</p>
);

const getDisplayDate = (date: string | Date | undefined | null): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (error) {
        console.warn("Could not parse date for display:", date, error);
        return '';
    }
};

const AdminCafeForm: React.FC<AdminCafeFormProps> = ({ cafe, onSave, onCancel, userRole, setNotification, onSuccess }) => {
    const { updateCafe } = useContext(CafeContext)!; // Need this for post-upload updates
    
    const [step, setStep] = useState(1);
    const isAdmin = userRole === 'admin';
    const isEditMode = !!cafe;

    const formSteps = isEditMode 
        ? (isAdmin 
            ? ['Info', 'Ops', 'Foto & Fasilitas', 'Spot', 'Sponsor'] 
            : ['Info', 'Ops', 'Foto & Fasilitas', 'Spot', 'Events'])
        : ['Info', 'Ops', 'Foto & Fasilitas'];


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
        isSponsored: cafe?.isSponsored || false, sponsoredUntil: getDisplayDate(cafe?.sponsoredUntil),
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
    const [isUploading, setIsUploading] = useState(false); // New state to show specific upload status
    const [isGeocoding, setIsGeocoding] = useState(false);
    const geocodeTimeoutRef = useRef<number | null>(null);

    const [isDirty, setIsDirty] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);

    const [locationInputType, setLocationInputType] = useState<'coords' | 'mapsLink'>('coords');
    const [mapsLinkInput, setMapsLinkInput] = useState('');

    useEffect(() => { if (logoFile) { const o = URL.createObjectURL(logoFile); setLogoPreview(o); return () => URL.revokeObjectURL(o); } }, [logoFile]);
    useEffect(() => { if (coverFile) { const o = URL.createObjectURL(coverFile); setCoverPreview(o); return () => URL.revokeObjectURL(o); } }, [coverFile]);
    useEffect(() => { const p = spotFiles.map(f => f ? URL.createObjectURL(f) : null); setSpotPreviews(p); return () => p.forEach(u => u && URL.revokeObjectURL(u)); }, [spotFiles]);
    useEffect(() => { const p = eventFiles.map(f => f ? URL.createObjectURL(f) : null); setEventPreviews(p); return () => p.forEach(u => u && URL.revokeObjectURL(u)); }, [eventFiles]);

    const markDirty = () => {
        if (!isDirty) setIsDirty(true);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        markDirty();
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            setFormData(prev => ({...prev, [name]: (e.target as HTMLInputElement).checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleCoordsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        markDirty();
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
        if (isEditMode) return;

        if (geocodeTimeoutRef.current) clearTimeout(geocodeTimeoutRef.current);
        geocodeTimeoutRef.current = window.setTimeout(async () => {
            const [lat, lng] = [parseFloat(String(formData.lat)), parseFloat(String(formData.lng))];
            if (isNaN(lat) || isNaN(lng)) return;
            setIsGeocoding(true);
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`);
                if (!res.ok) throw new Error('Layanan Geocoding gagal merespons.');
                const data = await res.json();
                if (data.error) throw new Error(data.error);

                const address = data.display_name || '';
                const city = data.address.city || data.address.county || data.address.state_district || '';
                const district = data.address.suburb || data.address.city_district || data.address.town || '';
                
                setFormData(prev => ({ 
                    ...prev, 
                    address: address, 
                    city: city, 
                    district: district
                }));
                markDirty();

                if (!city || !district) {
                    setNotification({ message: "Alamat ditemukan, namun Kota/Kecamatan tidak terdeteksi. Harap isi manual.", type: 'error' });
                }
            } catch (error) {
                console.error("Reverse geocoding error:", error);
                setNotification({ message: "Gagal mendapatkan alamat dari koordinat.", type: 'error' });
            } finally {
                setIsGeocoding(false);
            }
        }, 800);
    }, [formData.lat, formData.lng, setNotification, isEditMode]);
    
    useEffect(() => {
        if (formData.lat.trim() && formData.lng.trim()) handleReverseGeocode();
    }, [formData.lat, formData.lng, handleReverseGeocode]);

    const extractCoordsFromInput = (input: string): { lat: number, lng: number } | null => {
        const latLngRegex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
        const queryRegex = /[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/;
        
        let match = input.match(latLngRegex);
        if (!match) match = input.match(queryRegex);

        if (match && match.length >= 3) {
            return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) };
        }

        if (input.includes('+') && typeof OpenLocationCode !== 'undefined') {
            try {
                const potentialCode = input.trim().split(' ')[0].trim();
                if (OpenLocationCode.isValid(potentialCode)) {
                     const codeArea = OpenLocationCode.decode(potentialCode);
                     return { lat: codeArea.latitudeCenter, lng: codeArea.longitudeCenter };
                }
            } catch (e) {
                console.warn("OLC Decode error", e);
            }
        }
        return null;
    };

    const handleMapsLinkChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        markDirty();
        const { value } = e.target;
        setMapsLinkInput(value);

        if (value.trim().length > 4) {
            const coords = extractCoordsFromInput(value);
            if (coords) {
                setCoordsInput(`${coords.lat}, ${coords.lng}`);
                setFormData(prev => ({ ...prev, lat: String(coords.lat), lng: String(coords.lng) }));
            }
        }
    };

    const handleMultiSelectChange = (field: 'vibes' | 'amenities', item: Vibe | Amenity) => {
        markDirty();
        setFormData(prev => ({...prev, [field]: (prev[field] as any[]).some(i => i.id === item.id) ? (prev[field] as any[]).filter(i => i.id !== item.id) : [...prev[field], item]}));
    };

    const handleSpotChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        markDirty();
        const updatedSpots = [...formData.spots];
        updatedSpots[index] = { ...updatedSpots[index], [e.target.name]: e.target.value };
        setFormData(prev => ({ ...prev, spots: updatedSpots }));
    };

    const handleSpotFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            markDirty();
            const newSpotFiles = [...spotFiles];
            newSpotFiles[index] = e.target.files[0];
            setSpotFiles(newSpotFiles);
        }
    };

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

    const handleEventChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        markDirty();
        const { name, value } = e.target;
        const updatedEvents = [...formData.events];
        updatedEvents[index] = { ...updatedEvents[index], [name]: value };
        setFormData(prev => ({ ...prev, events: updatedEvents }));
    };

    const handleEventFileChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.[0]) {
            markDirty();
            const newEventFiles = [...eventFiles];
            newEventFiles[index] = e.target.files[0];
            setEventFiles(newEventFiles);
        }
    };
    
    const handleAddEvent = () => {
        markDirty();
        const today = new Date().toISOString().split('T')[0];
        setFormData(prev => ({...prev, events: [...prev.events, { id: `evt-${crypto.randomUUID()}`, name: '', description: '', start_date: today, end_date: today }] }));
        setEventFiles(prev => [...prev, null]);
    };

    const handleRemoveEvent = (index: number) => {
        markDirty();
        setFormData(prev => ({ ...prev, events: prev.events.filter((_, i) => i !== index) }));
        setEventFiles(prev => prev.filter((_, i) => i !== index));
    };

    const validateStep = (currentStep: number): { isValid: boolean, message: string | null } => {
        switch (currentStep) {
            case 1:
                if (!formData.name.trim()) return { isValid: false, message: 'Nama Kafe wajib diisi.' };
                if (!formData.address.trim() || !formData.city.trim() || !formData.district.trim()) return { isValid: false, message: 'Alamat, Kota, dan Kecamatan wajib diisi. Gunakan fitur "Link Google Maps" untuk isi otomatis.' };
                const lat = parseFloat(String(formData.lat));
                const lng = parseFloat(String(formData.lng));
                if (isNaN(lat) || isNaN(lng)) return { isValid: false, message: 'Koordinat Peta tidak valid (misal: -2.976, 104.745).' };
                break;
            case 3:
                // Cover file is required ONLY if there is no existing URL and no new file selected
                if (!coverFile && !formData.coverUrl) return { isValid: false, message: 'Foto Cover wajib diunggah agar kafe terlihat menarik.' };
                break;
            case 5:
                if (isAdmin && formData.isSponsored) {
                    const rank = Number(formData.sponsoredRank);
                    if (isNaN(rank) || rank < 0) return { isValid: false, message: 'Ranking Sponsor harus berupa angka positif.' };
                    if (!formData.sponsoredUntil) return { isValid: false, message: 'Tanggal "Sponsor Hingga" wajib diisi.' };
                }
                if (!isAdmin) {
                    for (const event of formData.events) {
                        if (event.name.trim() && (!event.start_date || !event.end_date)) return { isValid: false, message: `Harap tentukan tanggal mulai dan selesai untuk event "${event.name}".` };
                        if (new Date(event.end_date) < new Date(event.start_date)) return { isValid: false, message: `Tanggal selesai untuk event "${event.name}" tidak boleh sebelum tanggal mulai.` };
                    }
                }
                break;
            default:
                return { isValid: true, message: null };
        }
        return { isValid: true, message: null };
    };
    
    const nextStep = () => {
        const { isValid, message } = validateStep(step);
        if (isValid) {
            setNotification(null);
            setStep(s => Math.min(s + 1, formSteps.length));
        } else {
            setNotification({ message: message!, type: 'error' });
        }
    };

    const handleStepClick = (targetStep: number) => {
        if (targetStep < step) {
            setStep(targetStep);
            return;
        }
        for (let i = 1; i < targetStep; i++) {
            const { isValid, message } = validateStep(i);
            if (!isValid) {
                setNotification({ message: `Harap lengkapi Langkah ${i} terlebih dahulu: ${message}`, type: 'error' });
                setStep(i);
                return;
            }
        }
        setNotification(null);
        setStep(targetStep);
    };

    const prevStep = () => setStep(s => Math.max(s - 1, 1));
    const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => { if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement) && step < formSteps.length) { e.preventDefault(); nextStep(); } };

    const handleAttemptClose = () => {
        if (isDirty) {
            setShowExitConfirm(true);
        } else {
            onCancel();
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSaving) return;
        
        for (let i = 1; i <= formSteps.length; i++) {
            const { isValid, message } = validateStep(i);
            if (!isValid) {
                setNotification({ message: `Masalah di Langkah ${i}: ${message}`, type: 'error' });
                setStep(i);
                return;
            }
        }
        
        setIsSaving(true);
        
        try {
            // 1. PREPARE DATA (Use existing URLs or placeholders if uploading new ones)
            // We do NOT upload yet. We save the record first to ensure data integrity.
            
            const tempLogoUrl = logoFile ? formData.logoUrl : formData.logoUrl; // If new file, keep old URL temporarily or use blank if strictly new
            const tempCoverUrl = coverFile ? formData.coverUrl : formData.coverUrl;

            const payload = {
                name: formData.name.trim(),
                description: formData.description.trim(),
                address: formData.address.trim(),
                city: formData.city.trim(),
                district: formData.district.trim(),
                openingHours: formData.is24Hours ? '24 Jam' : `${formData.openingTime} - ${formData.closingTime}`,
                priceTier: Number(formData.priceTier),
                coords: { lat: parseFloat(String(formData.lat)), lng: parseFloat(String(formData.lng)) },
                logoUrl: tempLogoUrl,
                coverUrl: tempCoverUrl,
                vibes: formData.vibes,
                amenities: formData.amenities,
                spots: formData.spots, // Spots with existing URLs or empty
                events: !isAdmin ? formData.events : [],
                isSponsored: isAdmin ? formData.isSponsored : (cafe?.isSponsored || false),
                sponsoredUntil: isAdmin && formData.isSponsored && formData.sponsoredUntil ? `${formData.sponsoredUntil}T12:00:00.000Z` : null,
                sponsoredRank: isAdmin && formData.isSponsored ? Number(formData.sponsoredRank) : 0,
                phoneNumber: formData.phoneNumber.trim(),
                websiteUrl: formData.websiteUrl.trim(),
            };

            if (!payload.logoUrl) delete (payload as any).logoUrl;
            if (!payload.coverUrl && !coverFile) delete (payload as any).coverUrl; // If no file and no url, don't send empty string if possible

            // 2. SAVE TEXT DATA TO DB
            const { data: savedCafe, error } = await onSave(payload);
            if (error) throw error;

            const cafeId = savedCafe.id; // Get the ID of the newly created/updated cafe

            // 3. UPLOAD IMAGES (If new files exist)
            if (logoFile || coverFile || spotFiles.some(f => f !== null) || eventFiles.some(f => f !== null)) {
                setIsUploading(true);
                
                const logoUploadPromise = logoFile ? fileToBase64(logoFile).then(base64 => cloudinaryService.uploadImage(base64)) : Promise.resolve(null);
                const coverUploadPromise = coverFile ? fileToBase64(coverFile).then(base64 => cloudinaryService.uploadImage(base64)) : Promise.resolve(null);
                
                const spotUploadPromises = formData.spots.map((spot, i) => spotFiles[i] ? fileToBase64(spotFiles[i]!).then(base64 => cloudinaryService.uploadImage(base64)) : Promise.resolve(spot.photoUrl));
                
                const eventUploadPromises = !isAdmin ? formData.events.map((event, i) => eventFiles[i] ? fileToBase64(eventFiles[i]!).then(base64 => cloudinaryService.uploadImage(base64)) : Promise.resolve(event.imageUrl || '')) : [];

                const [newLogoUrl, newCoverUrl, ...restUrls] = await Promise.all([logoUploadPromise, coverUploadPromise, ...spotUploadPromises, ...eventUploadPromises]);
                
                const finalSpotUrls = restUrls.slice(0, spotUploadPromises.length);
                const finalEventUrls = restUrls.slice(spotUploadPromises.length);

                // 4. UPDATE RECORD WITH IMAGE URLS
                const updatePayload: any = {};
                if (newLogoUrl) updatePayload.logoUrl = newLogoUrl;
                if (newCoverUrl) updatePayload.coverUrl = newCoverUrl;

                // Reconstruct spots/events with new URLs
                const updatedSpots = formData.spots.map((spot, i) => ({ ...spot, photoUrl: finalSpotUrls[i] || spot.photoUrl }));
                const updatedEvents = !isAdmin ? formData.events.map((event, i) => {
                     const startDateString = getDisplayDate(event.start_date);
                     const endDateString = getDisplayDate(event.end_date);
                     return {
                        ...event,
                        imageUrl: finalEventUrls[i] || event.imageUrl,
                        start_date: startDateString ? `${startDateString}T00:00:00Z` : new Date().toISOString(),
                        end_date: endDateString ? `${endDateString}T23:59:59Z` : new Date().toISOString(),
                     }
                }) : [];

                if (spotFiles.some(f => f) || eventFiles.some(f => f)) {
                     updatePayload.spots = updatedSpots;
                     updatePayload.events = updatedEvents;
                }

                if (Object.keys(updatePayload).length > 0) {
                     await updateCafe(cafeId, updatePayload);
                }
            }
            
            onSuccess();

        } catch (error: any) {
            console.error("Form Submission Error:", error);
            const errorMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            setNotification({ message: `Gagal menyimpan data: ${errorMsg}`, type: 'error' });
        } finally {
            setIsSaving(false);
            setIsUploading(false);
        }
    };
    
    const inputClass = "w-full p-3 border border-border bg-soft rounded-xl text-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-200";
    const fileInputClass = "w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand dark:file:bg-brand/20 dark:file:text-brand-light hover:file:bg-brand/20 dark:hover:file:bg-brand/30 transition-colors cursor-pointer";
    const fieldsetStyles = "border border-border p-4 rounded-xl space-y-4 h-full flex flex-col"; 
    const legendStyles = "font-semibold px-2 text-primary dark:text-gray-200 flex items-center gap-2";
    
    return (
        <>
        {/* High z-index [1200] to cover Floating Dock (z-100) */}
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[1200] animate-fade-in-up" onClick={handleAttemptClose}>
            <div className="bg-card dark:bg-gray-800 rounded-3xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-border" onClick={e => e.stopPropagation()}>
                <div className="p-4 sm:p-6 border-b border-border flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold font-jakarta text-primary dark:text-white">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                        <button onClick={handleAttemptClose} className="p-2 rounded-full hover:bg-soft dark:hover:bg-gray-700">
                            <XMarkIcon className="h-6 w-6 text-primary dark:text-white" />
                        </button>
                    </div>
                    <MultiStepProgressBar steps={formSteps} currentStep={step} onStepClick={handleStepClick} />
                </div>
                
                {/* min-h-0 is critical for flex container overflow to work correctly */}
                <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="p-4 sm:p-6 space-y-6 overflow-y-auto flex-grow min-h-0">
                    {step === 1 && ( 
                        <div className="space-y-6 animate-fade-in-up"> 
                            <h3 className="font-bold text-xl mb-2 dark:text-white">Langkah 1: Info & Vibe</h3> 
                            <fieldset className={fieldsetStyles}> 
                                <legend className={legendStyles}><IdentificationIcon className="h-5 w-5 text-brand"/> Identitas Kafe</legend> 
                                <FormGroup><FormLabel htmlFor="name" icon={<IdentificationIcon className="h-4 w-4" />}>Nama Cafe<span className="text-accent-pink ml-1">*</span></FormLabel><input id="name" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Kopi Senja" className={inputClass} required /></FormGroup> 
                                <FormGroup> <FormLabel htmlFor="description" icon={<DocumentTextIcon className="h-4 w-4" />}>Deskripsi</FormLabel> <div className="relative"> <textarea id="description" name="description" value={formData.description} onChange={handleChange} placeholder="Jelaskan keunikan dari cafe ini..." className={`${inputClass} h-24`} /> </div> <FormHelperText>Jelaskan keunikan dari cafe ini.</FormHelperText> </FormGroup> 
                                <FormGroup><FormLabel htmlFor="vibes" icon={<SparklesIcon className="h-4 w-4" />}>Vibe Kafe</FormLabel><div className="flex flex-wrap gap-3">{VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-4 py-2 rounded-full border-2 font-semibold ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'}`}>{v.name}</button>)}</div></FormGroup> 
                            </fieldset> 
                            <fieldset className={fieldsetStyles}> 
                                <legend className={legendStyles}><PhoneIcon className="h-5 w-5 text-brand"/> Kontak & Website</legend> 
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> 
                                    <FormGroup> <FormLabel htmlFor="phoneNumber" icon={<PhoneIcon className="h-4 w-4" />}>Nomor Telepon / WA</FormLabel> <input id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} placeholder="Contoh: 08123456789" className={inputClass} /> </FormGroup> 
                                    <FormGroup> <FormLabel htmlFor="websiteUrl" icon={<GlobeAltIcon className="h-4 w-4" />}>Website / Instagram Link</FormLabel> <input id="websiteUrl" name="websiteUrl" value={formData.websiteUrl} onChange={handleChange} placeholder="Contoh: https://instagram.com/kopisenja" className={inputClass} /> </FormGroup> 
                                </div> 
                            </fieldset> 
                            <fieldset className={fieldsetStyles}> 
                                <legend className={legendStyles}><MapIcon className="h-5 w-5 text-brand"/> Lokasi</legend> 
                                {!isEditMode && ( <div className="flex bg-soft dark:bg-gray-700/50 p-1 rounded-xl mb-4"> <button type="button" onClick={() => setLocationInputType('coords')} className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${locationInputType === 'coords' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Koordinat Peta</button> <button type="button" onClick={() => setLocationInputType('mapsLink')} className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${locationInputType === 'mapsLink' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}>Link Google Maps</button> </div> )} 
                                {locationInputType === 'coords' || isEditMode ? ( <FormGroup> <FormLabel htmlFor="coords" icon={<MapPinIcon className="h-4 w-4" />}>Koordinat Peta<span className="text-accent-pink ml-1">*</span></FormLabel> <input id="coords" name="coords" type="text" value={coordsInput} onChange={handleCoordsChange} placeholder="-2.9760, 104.7458" className={inputClass} required /> <FormHelperText>Salin & tempel koordinat dari Google Maps. {isEditMode ? '' : 'Alamat akan terisi otomatis.'}</FormHelperText> </FormGroup> ) : ( <FormGroup> <FormLabel htmlFor="mapsLink" icon={<LinkIcon className="h-4 w-4" />}>Link Google Maps / Plus Code<span className="text-accent-pink ml-1">*</span></FormLabel> <div className="relative"> <input id="mapsLink" name="mapsLink" type="text" value={mapsLinkInput} onChange={handleMapsLinkChange} placeholder="https://www.google.com/maps/... atau 6P5G+R8" className={inputClass} /> </div> <FormHelperText>Paste link Maps atau Plus Code (e.g. 6P5G+R8). Koordinat & alamat akan terisi otomatis.</FormHelperText> </FormGroup> )} 
                                <FormGroup><FormLabel htmlFor="address" icon={<MapPinIcon className="h-4 w-4" />}>Alamat {isEditMode ? '' : '(Otomatis)'}<span className="text-accent-pink ml-1">*</span></FormLabel><div className="relative"><input id="address" name="address" value={formData.address} onChange={handleChange} placeholder="Menunggu koordinat..." className={`${inputClass} pr-10`} required />{isGeocoding && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-brand"></div></div>}</div><FormHelperText>Pastikan alamat lengkap dan jelas.</FormHelperText></FormGroup> <div className="grid grid-cols-1 md:grid-cols-2 gap-4"> <FormGroup> <FormLabel htmlFor="city" icon={<BuildingOffice2Icon className="h-4 w-4" />}>Kota / Kabupaten<span className="text-accent-pink ml-1">*</span></FormLabel> <select id="city" name="city" value={formData.city} onChange={handleChange} className={inputClass}> {SOUTH_SUMATRA_CITIES.map(city => (<option key={city} value={city}>{city}</option>))} </select> </FormGroup> <FormGroup> <FormLabel htmlFor="district" icon={<BuildingOffice2Icon className="h-4 w-4" />}>Kecamatan<span className="text-accent-pink ml-1">*</span></FormLabel> <input id="district" name="district" value={formData.district} onChange={handleChange} placeholder="Contoh: Ilir Barat I" className={inputClass} required /> </FormGroup> </div> 
                            </fieldset> 
                        </div>
                    )}

                    {step === 2 && (
                         <div className="space-y-6 animate-fade-in-up h-full flex flex-col">
                            <h3 className="font-bold text-xl mb-2 dark:text-white">Langkah 2: Operasional</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch h-full">
                                <fieldset className={fieldsetStyles}>
                                    <legend className={legendStyles}><ClockIcon className="h-5 w-5 text-brand"/> Jam Buka</legend>
                                    <div className="flex flex-col justify-center h-full space-y-4">
                                        <div className="flex items-center">
                                            <input id="is24Hours" name="is24Hours" type="checkbox" checked={formData.is24Hours} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand mr-2 cursor-pointer" />
                                            <label htmlFor="is24Hours" className="text-primary dark:text-gray-200 cursor-pointer">Buka 24 Jam</label>
                                        </div>
                                        {!formData.is24Hours && (
                                            <div className="grid grid-cols-2 gap-4">
                                                <FormGroup><FormLabel htmlFor="openingTime" icon={<ClockIcon className="h-4 w-4"/>}>Buka</FormLabel><input type="time" id="openingTime" name="openingTime" value={formData.openingTime} onChange={handleChange} className={inputClass} /></FormGroup>
                                                <FormGroup><FormLabel htmlFor="closingTime" icon={<ClockIcon className="h-4 w-4"/>}>Tutup</FormLabel><input type="time" id="closingTime" name="closingTime" value={formData.closingTime} onChange={handleChange} className={inputClass} /></FormGroup>
                                            </div>
                                        )}
                                        <div className="flex-grow"></div>
                                    </div>
                                </fieldset>
                                <fieldset className={fieldsetStyles}>
                                    <legend className={legendStyles}><CurrencyDollarIcon className="h-5 w-5 text-green-500"/> Kisaran Harga</legend>
                                    <div className="flex flex-col justify-center h-full">
                                        <div className="grid grid-cols-2 gap-3 flex-grow">
                                            {[1, 2, 3, 4].map(tier => (
                                                <label key={tier} className={`p-3 rounded-xl border-2 cursor-pointer text-center transition-all flex flex-col items-center justify-center ${Number(formData.priceTier) === tier ? 'border-brand bg-brand/10 text-brand font-bold shadow-inner' : 'border-border bg-soft dark:bg-gray-700 text-muted hover:border-brand/50'}`}>
                                                    <input type="radio" name="priceTier" value={tier} checked={Number(formData.priceTier) === tier} onChange={handleChange} className="hidden" />
                                                    <div className="text-lg leading-none mb-1">{'$'.repeat(tier)}</div>
                                                    <div className="text-[10px] uppercase tracking-wide">{['Budget', 'Standar', 'Premium', 'Luxury'][tier - 1]}</div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                </fieldset>
                            </div>
                         </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 animate-fade-in-up">
                             <h3 className="font-bold text-xl mb-2 dark:text-white">Langkah 3: Gambar & Fasilitas</h3>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 <FormGroup>
                                     <FormLabel htmlFor="logo" icon={<PhotoIcon className="h-4 w-4" />}>Logo Kafe</FormLabel>
                                     <div className="flex flex-col items-center p-4 border-2 border-dashed border-border rounded-xl bg-soft dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                         {logoPreview || formData.logoUrl ? (
                                             <img src={logoPreview || formData.logoUrl} alt="Logo Preview" className="w-24 h-24 object-contain mb-2 rounded-lg" />
                                         ) : (
                                             <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg mb-2 flex items-center justify-center text-muted text-xs">No Logo</div>
                                         )}
                                         <input type="file" id="logo" accept="image/*" onChange={(e) => { markDirty(); setLogoFile(e.target.files?.[0] || null); }} className={fileInputClass} />
                                     </div>
                                 </FormGroup>
                                 <FormGroup>
                                     <FormLabel htmlFor="cover" icon={<PhotoIcon className="h-4 w-4" />}>Foto Cover (Wajib)<span className="text-accent-pink ml-1">*</span></FormLabel>
                                     <div className="flex flex-col items-center p-4 border-2 border-dashed border-border rounded-xl bg-soft dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                                         {coverPreview || formData.coverUrl ? (
                                             <img src={coverPreview || formData.coverUrl} alt="Cover Preview" className="w-full h-32 object-cover mb-2 rounded-lg" />
                                         ) : (
                                             <div className="w-full h-32 bg-gray-200 dark:bg-gray-600 rounded-lg mb-2 flex items-center justify-center text-muted">No Cover</div>
                                         )}
                                         <input type="file" id="cover" accept="image/*" onChange={(e) => { markDirty(); setCoverFile(e.target.files?.[0] || null); }} className={fileInputClass} />
                                     </div>
                                 </FormGroup>
                             </div>
                             <fieldset className={fieldsetStyles}>
                                 <legend className={legendStyles}><WifiIcon className="h-5 w-5 text-brand"/> Fasilitas</legend>
                                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                     {AMENITIES.map(amenity => (
                                         <button type="button" key={amenity.id} onClick={() => handleMultiSelectChange('amenities', amenity)} className={`p-3 rounded-xl border-2 flex flex-col items-center justify-center transition-all ${formData.amenities.some(a => a.id === amenity.id) ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 dark:bg-gray-700'}`}>
                                             <span className="text-2xl mb-1">{amenity.icon}</span>
                                             <span className="text-xs font-semibold">{amenity.name}</span>
                                         </button>
                                     ))}
                                 </div>
                             </fieldset>
                        </div>
                    )}

                    {step === 4 && (
                         <div className="space-y-6 animate-fade-in-up">
                             <div className="flex justify-between items-center">
                                 <h3 className="font-bold text-xl dark:text-white">Langkah 4: Spot Foto</h3>
                                 <button type="button" onClick={handleAddSpot} className="flex items-center gap-1 text-sm bg-brand/10 text-brand px-3 py-1.5 rounded-lg hover:bg-brand/20 font-bold"><PlusIcon className="h-4 w-4"/> Tambah Spot</button>
                             </div>
                             {formData.spots.length === 0 ? (
                                 <div className="text-center p-8 border-2 border-dashed border-border rounded-xl text-muted">Belum ada spot foto yang ditambahkan.</div>
                             ) : (
                                 <div className="space-y-4">
                                     {formData.spots.map((spot, index) => (
                                         <div key={index} className="p-4 border border-border rounded-xl bg-soft dark:bg-gray-700/50 relative">
                                             <button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-50 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                             <div className="grid grid-cols-1 sm:grid-cols-[100px_1fr] gap-4">
                                                 <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex items-center justify-center">
                                                     {spotPreviews[index] || spot.photoUrl ? (
                                                         <img src={spotPreviews[index] || spot.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                                                     ) : (
                                                         <PhotoIcon className="h-8 w-8 text-muted" />
                                                     )}
                                                 </div>
                                                 <div className="space-y-3">
                                                     <input type="file" accept="image/*" onChange={(e) => handleSpotFileChange(index, e)} className="text-xs text-muted file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-xs file:bg-gray-200 file:text-gray-700 hover:file:bg-gray-300" />
                                                     <div className="flex items-center gap-2">
                                                        <CameraIcon className="h-5 w-5 text-muted" />
                                                        <input type="text" name="title" placeholder="Nama Spot (misal: Jendela Besar)" value={spot.title} onChange={(e) => handleSpotChange(index, e)} className={inputClass} />
                                                     </div>
                                                     <div className="flex items-center gap-2">
                                                        <LightBulbIcon className="h-5 w-5 text-muted" />
                                                        <input type="text" name="tip" placeholder="Tips Foto (opsional)" value={spot.tip} onChange={(e) => handleSpotChange(index, e)} className={inputClass} />
                                                     </div>
                                                 </div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             )}
                         </div>
                    )}

                    {step === 5 && (
                         <div className="space-y-6 animate-fade-in-up">
                             <h3 className="font-bold text-xl mb-2 dark:text-white">Langkah 5: {isAdmin ? 'Sponsor' : 'Events & Promo'}</h3>
                             
                             {isAdmin ? (
                                 <fieldset className={fieldsetStyles}>
                                     <legend className={legendStyles}><StarIcon className="h-5 w-5 text-brand"/> Status Sponsor</legend>
                                     <div className="flex items-center mb-4">
                                         <input id="isSponsored" name="isSponsored" type="checkbox" checked={formData.isSponsored} onChange={handleChange} className="w-5 h-5 rounded border-gray-300 text-brand focus:ring-brand mr-2" />
                                         <label htmlFor="isSponsored" className="text-primary dark:text-gray-200 font-semibold">Aktifkan Sponsor</label>
                                     </div>
                                     {formData.isSponsored && (
                                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-down">
                                             <FormGroup>
                                                 <FormLabel htmlFor="sponsoredUntil" icon={<CalendarDaysIcon className="h-4 w-4"/>}>Berlaku Hingga</FormLabel>
                                                 <input type="date" id="sponsoredUntil" name="sponsoredUntil" value={formData.sponsoredUntil} onChange={handleChange} className={inputClass} required />
                                             </FormGroup>
                                             <FormGroup>
                                                 <FormLabel htmlFor="sponsoredRank" icon={<StarIcon className="h-4 w-4"/>}>Ranking (1-10)</FormLabel>
                                                 <input type="number" id="sponsoredRank" name="sponsoredRank" value={formData.sponsoredRank} onChange={handleChange} className={inputClass} min="1" max="10" />
                                                 <FormHelperText>Semakin kecil angka, semakin tinggi posisi muncul.</FormHelperText>
                                             </FormGroup>
                                         </div>
                                     )}
                                 </fieldset>
                             ) : (
                                 <div>
                                     <div className="flex justify-between items-center mb-4">
                                         <p className="text-muted text-sm">Tambahkan event atau promo yang sedang berlangsung.</p>
                                         <button type="button" onClick={handleAddEvent} className="flex items-center gap-1 text-sm bg-brand/10 text-brand px-3 py-1.5 rounded-lg hover:bg-brand/20 font-bold"><PlusIcon className="h-4 w-4"/> Tambah Event</button>
                                     </div>
                                     {formData.events.length === 0 ? (
                                         <div className="text-center p-8 border-2 border-dashed border-border rounded-xl text-muted">Belum ada event.</div>
                                     ) : (
                                         <div className="space-y-4">
                                             {formData.events.map((event, index) => (
                                                 <div key={index} className="p-4 border border-border rounded-xl bg-soft dark:bg-gray-700/50 relative">
                                                     <button type="button" onClick={() => handleRemoveEvent(index)} className="absolute top-2 right-2 p-1 text-red-400 hover:bg-red-50 rounded-full"><TrashIcon className="h-5 w-5" /></button>
                                                     <div className="grid grid-cols-1 gap-3">
                                                         <FormGroup><FormLabel htmlFor={`evt-name-${index}`} icon={<TicketIcon className="h-4 w-4"/>}>Nama Event</FormLabel><input id={`evt-name-${index}`} name="name" value={event.name} onChange={(e) => handleEventChange(index, e)} className={inputClass} placeholder="Live Music, Promo Merdeka, dll" /></FormGroup>
                                                         <div className="grid grid-cols-2 gap-3">
                                                             <FormGroup><FormLabel htmlFor={`evt-start-${index}`} icon={<CalendarDaysIcon className="h-4 w-4"/>}>Mulai</FormLabel><input type="date" id={`evt-start-${index}`} name="start_date" value={getDisplayDate(event.start_date)} onChange={(e) => handleEventChange(index, e)} className={inputClass} /></FormGroup>
                                                             <FormGroup><FormLabel htmlFor={`evt-end-${index}`} icon={<CalendarDaysIcon className="h-4 w-4"/>}>Selesai</FormLabel><input type="date" id={`evt-end-${index}`} name="end_date" value={getDisplayDate(event.end_date)} onChange={(e) => handleEventChange(index, e)} className={inputClass} /></FormGroup>
                                                         </div>
                                                          <FormGroup><FormLabel htmlFor={`evt-desc-${index}`} icon={<DocumentTextIcon className="h-4 w-4"/>}>Deskripsi Singkat</FormLabel><textarea id={`evt-desc-${index}`} name="description" value={event.description} onChange={(e) => handleEventChange(index, e)} className={`${inputClass} h-20`} /></FormGroup>
                                                          <FormGroup>
                                                             <FormLabel htmlFor={`evt-img-${index}`} icon={<PhotoIcon className="h-4 w-4"/>}>Poster Event (Opsional)</FormLabel>
                                                             <div className="flex items-center gap-3">
                                                                 <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden flex-shrink-0">
                                                                     {eventPreviews[index] || event.imageUrl ? <img src={eventPreviews[index] || event.imageUrl} className="w-full h-full object-cover"/> : <PhotoIcon className="h-full w-full p-4 text-muted"/>}
                                                                 </div>
                                                                 <input type="file" accept="image/*" onChange={(e) => handleEventFileChange(index, e)} className="text-sm text-muted" />
                                                             </div>
                                                          </FormGroup>
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>
                    )}
                </form>

                <div className="p-4 sm:p-6 border-t border-border flex justify-between items-center bg-card flex-shrink-0 z-10 relative">
                    <button onClick={step === 1 ? handleAttemptClose : prevStep} className="px-6 py-2.5 rounded-xl font-bold text-muted hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors" disabled={isSaving}>
                        {step === 1 ? 'Batal' : 'Kembali'}
                    </button>
                    {step < formSteps.length ? (
                        <button onClick={nextStep} className="px-8 py-2.5 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20">
                            Lanjut
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isSaving} className="px-8 py-2.5 bg-brand text-white rounded-xl font-bold hover:bg-brand/90 transition-all shadow-lg shadow-brand/20 flex items-center gap-2 disabled:opacity-50 disabled:cursor-wait">
                            {isUploading ? 'Mengupload...' : (isSaving ? 'Menyimpan...' : (isEditMode ? 'Simpan Perubahan' : 'Kirim Data'))}
                        </button>
                    )}
                </div>
            </div>
        </div>
        
        {showExitConfirm && (
            <ConfirmationModal
                title="Perubahan Belum Disimpan"
                message="Anda memiliki perubahan yang belum disimpan. Apakah Anda yakin ingin menutup formulir ini?"
                onConfirm={onCancel}
                onCancel={() => setShowExitConfirm(false)}
                confirmText="Ya, Tutup"
                cancelText="Batal"
            />
        )}
        </>
    );
};

export default AdminCafeForm;
