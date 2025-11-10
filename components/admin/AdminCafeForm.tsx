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
    
    const uploadImageIfPresent = async (file: File | null, existingUrl: string): Promise<string> => {
        if (!file) {
            return existingUrl;
        }
        const base64 = await fileToBase64(file);
        return await cloudinaryService.uploadImage(base64);
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
            const [finalLogoUrl, finalCoverUrl] = await Promise.all([
                uploadImageIfPresent(logoFile, formData.logoUrl),
                uploadImageIfPresent(coverFile, formData.coverUrl)
            ]);

            const finalSpots = await Promise.all(
                formData.spots.map(async (spot, index) => {
                    const finalPhotoUrl = await uploadImageIfPresent(spotFiles[index], spot.photoUrl);
                    return { ...spot, photoUrl: finalPhotoUrl };
                })
            );
            
            let dataToSave = {
                ...formData,
                logoUrl: finalLogoUrl,
                coverUrl: finalCoverUrl,
                spots: finalSpots,
                priceTier: Number(formData.priceTier),
                coords: { lat: Number(formData.lat), lng: Number(formData.lng) },
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
    
    const inputClass = "w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white";
    const totalSaving = isSaving || isUploading;
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold font-jakarta">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Cafe" className={inputClass} required />
                
                <div>
                    <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Deskripsi Cafe (bisa di-generate AI)" className={`${inputClass} h-24`} />
                    <button type="button" onClick={handleGenerateDescription} disabled={isGeneratingDesc || !formData.name} className="mt-2 w-full bg-secondary/20 text-cyan-800 dark:text-secondary font-semibold py-2 rounded-lg hover:bg-secondary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                        {isGeneratingDesc ? 'Generating...' : '✨ Generate Deskripsi dengan AI'}
                    </button>
                </div>

                <input name="address" value={formData.address} onChange={handleChange} placeholder="Alamat" className={inputClass} required />
                <input name="openingHours" value={formData.openingHours} onChange={handleChange} placeholder="Jam Buka (e.g., 08:00 - 22:00)" className={inputClass} required />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-semibold block mb-2">Logo (Opsional)</label>
                    {(logoFile || formData.logoUrl) && (
                        <ImageWithFallback src={logoFile ? URL.createObjectURL(logoFile) : formData.logoUrl} alt="Logo preview" className="w-24 h-24 object-contain rounded-xl mb-2 bg-gray-100 dark:bg-gray-700 p-1" />
                    )}
                    <input type="file" accept="image/*" onChange={handleLogoFileChange} className={`${inputClass} p-2`} />
                  </div>
                  <div>
                    <label className="font-semibold block mb-2">Cover Image</label>
                    {(coverFile || formData.coverUrl) && (
                         <ImageWithFallback src={coverFile ? URL.createObjectURL(coverFile) : formData.coverUrl} alt="Cover preview" className="w-full h-24 object-cover rounded-xl mb-2" />
                    )}
                    <input type="file" accept="image/*" onChange={handleCoverFileChange} className={`${inputClass} p-2`} />
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
                    <fieldset className="border dark:border-gray-600 p-4 rounded-xl">
                        <legend className="font-semibold px-2">Sponsorship</legend>
                        <div className="flex items-center gap-4 mb-4">
                            <label htmlFor="isSponsored" className="font-medium">Aktifkan Sponsorship</label>
                            <input type="checkbox" id="isSponsored" name="isSponsored" checked={formData.isSponsored} onChange={handleChange} className="h-5 w-5 rounded text-primary focus:ring-primary" />
                        </div>
                        {formData.isSponsored && (
                            <div className="grid grid-cols-2 gap-4">
                                <input name="sponsoredRank" type="number" value={formData.sponsoredRank} onChange={handleChange} placeholder="Ranking (e.g., 1)" className={inputClass} />
                                <input name="sponsoredUntil" type="date" value={formData.sponsoredUntil} onChange={handleChange} placeholder="Berlaku Sampai" className={inputClass} />
                            </div>
                        )}
                    </fieldset>
                )}

                <fieldset className="border dark:border-gray-600 p-4 rounded-xl">
                    <legend className="font-semibold px-2">Spot Foto</legend>
                    <div className="space-y-4">
                        {formData.spots.map((spot, index) => (
                            <div key={index} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 relative pt-6">
                                <button type="button" onClick={() => handleRemoveSpot(index)} className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full h-6 w-6 flex items-center justify-center font-bold text-lg leading-none hover:bg-red-500 hover:text-white transition-all">&times;</button>
                                <div className="grid grid-cols-1 gap-2">
                                    {(spotFiles[index] || spot.photoUrl) && (
                                        <ImageWithFallback src={spotFiles[index] ? URL.createObjectURL(spotFiles[index]!) : spot.photoUrl} alt="Spot preview" className="w-full h-32 object-cover rounded-md mb-2" />
                                    )}
                                    <input type="file" accept="image/*" onChange={(e) => handleSpotFileChange(index, e)} className="w-full p-2 border rounded-md text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    <input name="title" value={spot.title} onChange={(e) => handleSpotChange(index, e)} placeholder="Judul Spot" className="w-full p-2 border rounded-md text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                    <input name="tip" value={spot.tip} onChange={(e) => handleSpotChange(index, e)} placeholder="Tips Foto" className="w-full p-2 border rounded-md text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button type="button" onClick={handleAddSpot} className="mt-4 w-full bg-primary/10 dark:bg-primary/20 text-primary font-semibold py-2 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-all">+ Tambah Spot Foto</button>
                </fieldset>
                
                <h3 className="font-semibold pt-2">Vibes</h3>
                <div className="flex flex-wrap gap-2">
                    {VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v)} className={`px-3 py-1 rounded-full border-2 dark:border-gray-500 ${formData.vibes.some(fv => fv.id === v.id) ? 'bg-primary text-white border-primary' : 'dark:text-gray-300'}`}>{v.name}</button>)}
                </div>

                <h3 className="font-semibold pt-2">Fasilitas</h3>
                <div className="flex flex-wrap gap-2">
                    {AMENITIES.map(a => <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a)} className={`px-3 py-1 rounded-full border-2 dark:border-gray-500 ${formData.amenities.some(fa => fa.id === a.id) ? 'bg-primary text-white border-primary' : 'dark:text-gray-300'}`}>{a.icon} {a.name}</button>)}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-semibold disabled:bg-primary/50" disabled={totalSaving}>
                        {isUploading ? 'Uploading...' : (isSaving ? 'Menyimpan...' : 'Simpan')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AdminCafeForm;