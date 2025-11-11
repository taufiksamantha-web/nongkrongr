import React, { useState } from 'react';
import { Cafe, Amenity, Vibe, Spot } from '../../types';
import { cloudinaryService } from '../../services/cloudinaryService';
import { geminiService } from '../../services/geminiService';
import { AMENITIES, VIBES, DISTRICTS } from '../../constants';
import { PriceTier } from '../../types';
import { fileToBase64 } from '../../utils/fileUtils';
import ImageWithFallback from '../common/ImageWithFallback';

interface AdminCafeFormProps {
    cafe?: Cafe | null, 
    onSave: (cafe: any) => Promise<void>, 
    onCancel: () => void,
    isSaving: boolean,
    userRole: 'admin' | 'user';
}

const AdminCafeForm: React.FC<AdminCafeFormProps> = ({ cafe, onSave, onCancel, isSaving, userRole }) => {
    const [formData, setFormData] = useState({
        name: cafe?.name || '',
        description: cafe?.description || '',
        address: cafe?.address || '',
        district: cafe?.district || DISTRICTS[0],
        priceTier: cafe?.priceTier || PriceTier.STANDARD,
        logoUrl: cafe?.logoUrl || '',
        coverUrl: cafe?.coverUrl || '',
        openingHours: cafe?.openingHours || '09:00 - 22:00',
        lat: cafe?.coords?.lat || -2.97,
        lng: cafe?.coords?.lng || 104.77,
        isSponsored: cafe?.isSponsored || false,
        sponsoredUntil: cafe?.sponsoredUntil ? new Date(cafe.sponsoredUntil).toISOString().split('T')[0] : '',
        sponsoredRank: cafe?.sponsoredRank || 0,
        vibes: cafe?.vibes || [],
        amenities: cafe?.amenities || [],
        spots: cafe?.spots || [],
    });

    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [coverFile, setCoverFile] = useState<File | null>(null);
    const [spotFiles, setSpotFiles] = useState<(File | null)[]>(cafe?.spots.map(() => null) || []);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };

    const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setLogoFile(e.target.files[0]);
        }
    };

    const handleCoverFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setCoverFile(e.target.files[0]);
        }
    };
    
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
        const spotToUpdate = { ...updatedSpots[index], [name]: value };
        updatedSpots[index] = spotToUpdate;
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
        setFormData(prev => ({
            ...prev,
            spots: [
                ...prev.spots,
                { id: `new-${Date.now()}`, title: '', tip: '', photoUrl: '' }
            ]
        }));
        setSpotFiles(prev => [...prev, null]);
    };

    const handleRemoveSpot = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            spots: prev.spots.filter((_, index) => index !== indexToRemove)
        }));
        setSpotFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    };
    
    const handleGenerateDescription = async () => {
        if (!formData.name) {
            alert("Please enter a cafe name first to generate a description.");
            return;
        }
        setIsGeneratingDesc(true);
        try {
            const description = await geminiService.generateCafeDescription(formData.name, formData.vibes);
            setFormData(prev => ({ ...prev, description }));
        } catch (error) {
            console.error(error);
            alert(error instanceof Error ? error.message : "An unknown error occurred during AI generation.");
        } finally {
            setIsGeneratingDesc(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            // Handle Logo Image
            let finalLogoUrl = formData.logoUrl;
            if (logoFile) {
                finalLogoUrl = await cloudinaryService.uploadImage(await fileToBase64(logoFile));
            }

            // Handle Cover Image
            let finalCoverUrl = formData.coverUrl;
            if (coverFile) {
                finalCoverUrl = await cloudinaryService.uploadImage(await fileToBase64(coverFile));
            }

            // Handle Spot Images
            const finalSpots = await Promise.all(
                formData.spots.map(async (spot, index) => {
                    const spotFile = spotFiles[index];
                    let finalPhotoUrl = spot.photoUrl;
                    if (spotFile) {
                        finalPhotoUrl = await cloudinaryService.uploadImage(await fileToBase64(spotFile));
                    }
                    return {
                        ...spot, // Preserve all existing properties of the spot
                        photoUrl: finalPhotoUrl, // Only overwrite the photoUrl
                    };
                })
            );

            let dataToSave = {
                name: formData.name,
                description: formData.description,
                address: formData.address,
                district: formData.district,
                openingHours: formData.openingHours,
                priceTier: Number(formData.priceTier),
                coords: { lat: Number(formData.lat), lng: Number(formData.lng) },
                logoUrl: finalLogoUrl,
                coverUrl: finalCoverUrl,
                vibes: formData.vibes,
                amenities: formData.amenities,
                spots: finalSpots,
                isSponsored: formData.isSponsored,
                sponsoredUntil: formData.sponsoredUntil ? new Date(formData.sponsoredUntil) : null,
                sponsoredRank: Number(formData.sponsoredRank),
            };

            // Security: Non-admins cannot set sponsorship details
            if (userRole !== 'admin') {
                dataToSave = {
                    ...dataToSave,
                    isSponsored: false,
                    sponsoredUntil: null,
                    sponsoredRank: 0,
                };
            }

            await onSave(dataToSave);
        } catch (error) {
            console.error("Failed to save cafe:", error);
            alert(`Gagal menyimpan data. Mungkin ada masalah saat mengupload gambar. Pastikan preset 'nongkrongr_uploads' sudah dikonfigurasi sebagai 'unsigned' di dashboard Cloudinary Anda.\n\nError: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsUploading(false);
        }
    };
    
    const inputClass = "w-full p-3 border border-border bg-soft rounded-xl text-primary dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white focus:ring-2 focus:ring-brand focus:border-brand transition-colors duration-200";
    const spotInputClass = "w-full p-2 border border-border bg-soft rounded-md text-primary dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-1 focus:ring-brand focus:border-brand transition-colors";
    const fileInputClass = "w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand/10 file:text-brand dark:file:bg-brand/20 dark:file:text-brand-light hover:file:bg-brand/20 dark:hover:file:bg-brand/30 transition-colors cursor-pointer";
    const totalSaving = isSaving || isUploading;
    
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-card p-8 rounded-3xl shadow-xl w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold font-jakarta text-primary">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Cafe" className={inputClass} required />
                
                <div>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Deskripsi Cafe (bisa di-generate AI)" className={`${inputClass} h-24`} />
                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="mt-2 w-full bg-accent-cyan/10 text-accent-cyan dark:bg-accent-cyan/20 font-semibold py-2 rounded-lg hover:bg-accent-cyan/20 dark:hover:bg-accent-cyan/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isGeneratingDesc ? 'Generating...' : '✨ Generate Deskripsi dengan AI'}
                    </button>
                </div>

                <input name="address" value={formData.address} onChange={handleChange} placeholder="Alamat" className={inputClass} required />
                <input name="openingHours" value={formData.openingHours} onChange={handleChange} placeholder="Jam Buka (e.g., 08:00 - 22:00)" className={inputClass} required />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold text-primary block mb-2">Logo (Opsional)</label>
                    {(logoFile || formData.logoUrl) && (
                        <ImageWithFallback src={logoFile ? URL.createObjectURL(logoFile) : formData.logoUrl} alt="Logo preview" className="w-24 h-24 object-contain rounded-xl mb-2 bg-soft border border-border p-1" />
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoFileChange} className={fileInputClass} />
                  </div>
                  <div>
                    <label className="font-semibold text-primary block mb-2">Cover Image</label>
                    {(coverFile || formData.coverUrl) && (
                         <ImageWithFallback src={coverFile ? URL.createObjectURL(coverFile) : formData.coverUrl} alt="Cover preview" className="w-full h-24 object-cover rounded-xl mb-2" />
                    )}
                    <input type="file" accept="image/*" onChange={handleCoverFileChange} className={fileInputClass} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <input name="lat" type="number" step="any" value={formData.lat} onChange={handleChange} placeholder="Latitude" className={inputClass} required />
                    <input name="lng" type="number" step="any" value={formData.lng} onChange={handleChange} placeholder="Longitude" className={inputClass} required />
                </div>
                <select name="district" value={formData.district} onChange={handleChange} className={inputClass}>
                    {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <select name="priceTier" value={formData.priceTier} onChange={handleChange} className={inputClass}>
                    <option value={PriceTier.BUDGET}>Budget ($)</option>
                    <option value={PriceTier.STANDARD}>Standard ($$)</option>
                    <option value={PriceTier.PREMIUM}>Premium ($$$)</option>
                    <option value={PriceTier.LUXURY}>Luxury ($$$$)</option>
                </select>
                
                {userRole === 'admin' && (
                    <fieldset className="border border-border p-4 rounded-xl">
                        <legend className="font-semibold px-2 text-primary">Sponsorship</legend>
                        <div className="flex items-center gap-4 mb-4">
                            <label htmlFor="isSponsored" className="font-medium text-primary">Aktifkan Sponsorship</label>
                            <input type="checkbox" id="isSponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} className="h-5 w-5 rounded text-brand focus:ring-brand" />
                        </div>
                        {formData.isSponsored && (
                            <div className="grid grid-cols-2 gap-4">
                                <input name="sponsoredRank" type="number" value={formData.sponsoredRank} onChange={handleChange} placeholder="Ranking (e.g., 1)" className={inputClass} />
                                <input name="sponsoredUntil" type="date" value={formData.sponsoredUntil} onChange={handleChange} placeholder="Berlaku Sampai" className={inputClass} />
                            </div>
                        )}
                    </fieldset>
                )}

                <fieldset className="border border-border p-4 rounded-xl">
                    <legend className="font-semibold px-2 text-primary">Spot Foto</legend>
                    <div className="space-y-4">
                        {formData.spots.map((spot, index) => (
                            <div key={spot.id} className="border border-border p-3 rounded-lg bg-soft dark:bg-gray-900/50 relative pt-6">
                                <button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-300 rounded-full h-6 w-6 flex items-center justify-center font-bold text-lg leading-none hover:bg-red-500 hover:text-white dark:hover:bg-red-400 dark:hover:text-white transition-all">&times;</button>
                                <div className="grid grid-cols-1 gap-2">
                                    {(spotFiles[index] || spot.photoUrl) && (
                                        <ImageWithFallback src={spotFiles[index] ? URL.createObjectURL(spotFiles[index]!) : spot.photoUrl} alt="Spot preview" className="w-full h-32 object-cover rounded-md mb-2" />
                                    )}
                                    <input type="file" accept="image/*" onChange={(e) => handleSpotFileChange(index, e)} className={fileInputClass} />
                                    <input name="title" value={spot.title} onChange={(e) => handleSpotChange(index, e)} placeholder="Judul Spot" className={`${spotInputClass} mt-2`} />
                                    <input name="tip" value={spot.tip} onChange={(e) => handleSpotChange(index, e)} placeholder="Tips Foto" className={spotInputClass} />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddSpot} className="mt-4 w-full bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold py-2 rounded-lg transition-all">+ Tambah Spot Foto</button>
                </fieldset>
                
                <h3 className="font-semibold text-primary pt-2">Vibes</h3>
                <div className="flex flex-wrap gap-2">
                    {VIBES.map(v => {
                        const isSelected = formData.vibes.some(fv => fv.id === v.id);
                        return <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-3 py-1 rounded-full border-2 transition-colors duration-200 font-semibold ${isSelected ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 hover:text-brand'}`}>{v.name}</button>
                    })}
                </div>

                <h3 className="font-semibold text-primary pt-2">Fasilitas</h3>
                <div className="flex flex-wrap gap-2">
                    {AMENITIES.map(a => {
                       const isSelected = formData.amenities.some(fa => fa.id === a.id);
                       return <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`px-3 py-1 rounded-full border-2 transition-colors duration-200 font-semibold ${isSelected ? 'bg-brand text-white border-brand' : 'bg-soft border-border text-muted hover:border-brand/50 hover:text-brand'}`}>{a.icon} {a.name}</button>
                    })}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-100 dark:bg-gray-700 text-primary hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-semibold transition-colors">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-brand text-white rounded-xl font-semibold hover:bg-brand/90 transition-colors disabled:bg-brand/50" disabled={totalSaving}>
                        {isUploading ? 'Uploading...' : (isSaving ? 'Menyimpan...' : 'Simpan')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCafeForm;
