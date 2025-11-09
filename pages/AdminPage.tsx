import React, { useState, useEffect, useCallback } from 'react';
import { Cafe, Amenity, Vibe, Review, Spot } from '../types';
import { cafeService } from '../services/cafeService';
import { AMENITIES, VIBES, DISTRICTS } from '../constants';
import { PriceTier } from '../types';

const AdminCafeForm: React.FC<{ cafe?: Cafe | null, onSave: (cafe: any) => void, onCancel: () => void }> = ({ cafe, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
        name: cafe?.name || '',
        address: cafe?.address || '',
        district: cafe?.district || DISTRICTS[0],
        priceTier: cafe?.priceTier || PriceTier.STANDARD,
        coverUrl: cafe?.coverUrl || 'https://picsum.photos/800/600',
        openingHours: cafe?.openingHours || '09:00 - 22:00',
        lat: cafe?.coords.lat || -2.97,
        lng: cafe?.coords.lng || 104.77,
        isSponsored: cafe?.isSponsored || false,
        sponsoredUntil: cafe?.sponsoredUntil ? new Date(cafe.sponsoredUntil).toISOString().split('T')[0] : '',
        sponsoredRank: cafe?.sponsoredRank || 0,
        vibes: cafe?.vibes.map(v => v.id) || [],
        amenities: cafe?.amenities.map(a => a.id) || [],
        spots: cafe?.spots || [],
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({...prev, [name]: checked}));
        } else {
            setFormData(prev => ({...prev, [name]: value}));
        }
    };
    
    const handleMultiSelectChange = (field: 'vibes' | 'amenities', id: string) => {
        setFormData(prev => {
            const current = prev[field];
            const newSelection = current.includes(id) ? current.filter(itemId => itemId !== id) : [...current, id];
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

    const handleAddSpot = () => {
        setFormData(prev => ({
            ...prev,
            spots: [
                ...prev.spots,
                { id: `new-${Date.now()}`, title: '', tip: '', photoUrl: 'https://picsum.photos/600/400' }
            ]
        }));
    };

    const handleRemoveSpot = (indexToRemove: number) => {
        setFormData(prev => ({
            ...prev,
            spots: prev.spots.filter((_, index) => index !== indexToRemove)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            priceTier: Number(formData.priceTier),
            coords: { lat: Number(formData.lat), lng: Number(formData.lng) },
            sponsoredUntil: formData.sponsoredUntil ? new Date(formData.sponsoredUntil) : null,
            sponsoredRank: Number(formData.sponsoredRank),
            vibes: formData.vibes.map(id => VIBES.find(v => v.id === id)).filter(Boolean) as Vibe[],
            amenities: formData.amenities.map(id => AMENITIES.find(a => a.id === id)).filter(Boolean) as Amenity[],
        };
        onSave(dataToSave);
    };
    
    const inputClass = "w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400";
    
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-2xl font-bold font-jakarta">{cafe ? 'Edit Cafe' : 'Tambah Cafe Baru'}</h2>
                <input name="name" value={formData.name} onChange={handleChange} placeholder="Nama Cafe" className={inputClass} required />
                <input name="address" value={formData.address} onChange={handleChange} placeholder="Alamat" className={inputClass} required />
                 <input name="openingHours" value={formData.openingHours} onChange={handleChange} placeholder="Jam Buka (e.g., 08:00 - 22:00)" className={inputClass} required />
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

                <fieldset className="border dark:border-gray-600 p-4 rounded-xl">
                    <legend className="font-semibold px-2">Spot Foto</legend>
                    <div className="space-y-4">
                        {formData.spots.map((spot, index) => (
                            <div key={index} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 relative pt-6">
                                <button 
                                    type="button" 
                                    onClick={() => handleRemoveSpot(index)} 
                                    className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full h-6 w-6 flex items-center justify-center font-bold text-lg leading-none hover:bg-red-500 hover:text-white transition-all">
                                    &times;
                                </button>
                                <div className="grid grid-cols-1 gap-2">
                                    <input 
                                        name="title" 
                                        value={spot.title} 
                                        onChange={(e) => handleSpotChange(index, e)} 
                                        placeholder="Judul Spot" 
                                        className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" 
                                    />
                                    <input 
                                        name="tip" 
                                        value={spot.tip} 
                                        onChange={(e) => handleSpotChange(index, e)} 
                                        placeholder="Tips Foto" 
                                        className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" 
                                    />
                                    <input 
                                        name="photoUrl" 
                                        value={spot.photoUrl} 
                                        onChange={(e) => handleSpotChange(index, e)} 
                                        placeholder="URL Foto" 
                                        className="w-full p-2 border rounded-md dark:bg-gray-600 dark:border-gray-500" 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button 
                        type="button" 
                        onClick={handleAddSpot} 
                        className="mt-4 w-full bg-primary/10 dark:bg-primary/20 text-primary font-semibold py-2 rounded-lg hover:bg-primary/20 dark:hover:bg-primary/30 transition-all">
                        + Tambah Spot Foto
                    </button>
                </fieldset>
                
                <h3 className="font-semibold pt-2">Vibes</h3>
                <div className="flex flex-wrap gap-2">
                    {VIBES.map(v => <button type="button" key={v.id} onClick={() => handleMultiSelectChange('vibes', v.id)} className={`px-3 py-1 rounded-full border-2 dark:border-gray-500 ${formData.vibes.includes(v.id) ? 'bg-primary text-white border-primary' : 'dark:text-gray-300'}`}>{v.name}</button>)}
                </div>

                <h3 className="font-semibold pt-2">Fasilitas</h3>
                <div className="flex flex-wrap gap-2">
                    {AMENITIES.map(a => <button type="button" key={a.id} onClick={() => handleMultiSelectChange('amenities', a.id)} className={`px-3 py-1 rounded-full border-2 dark:border-gray-500 ${formData.amenities.includes(a.id) ? 'bg-primary text-white border-primary' : 'dark:text-gray-300'}`}>{a.icon} {a.name}</button>)}
                </div>

                <div className="flex justify-end gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="px-6 py-2 bg-gray-200 dark:bg-gray-600 rounded-xl font-semibold">Batal</button>
                    <button type="submit" className="px-6 py-2 bg-primary text-white rounded-xl font-semibold">Simpan</button>
                </div>
            </form>
        </div>
    );
};

type PendingReview = Review & { cafeName: string; cafeId: string };

const PendingReviews: React.FC<{ onAction: () => void }> = ({ onAction }) => {
    const [reviews, setReviews] = useState<PendingReview[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchReviews = useCallback(async () => {
        setLoading(true);
        const data = await cafeService.getPendingReviews();
        setReviews(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchReviews();
    }, [fetchReviews]);
    
    const handleUpdateStatus = async (reviewId: string, status: Review['status']) => {
        await cafeService.updateReviewStatus(reviewId, status);
        fetchReviews();
        onAction(); // Reload cafes in parent
    };
    
    if (loading) return <p>Loading reviews...</p>;

    return (
         <div className="mt-12">
            <h2 className="text-3xl font-bold font-jakarta mb-6">Moderasi Review ({reviews.length})</h2>
            {reviews.length === 0 ? <p className="text-gray-500 dark:text-gray-400">Tidak ada review yang menunggu moderasi.</p> : (
            <div className="space-y-4">
                {reviews.map(review => (
                    <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm">
                        <div className="flex justify-between items-start flex-wrap">
                           <div className="flex-grow">
                                <p className="font-bold text-lg">{review.author} <span className="font-normal text-gray-500 dark:text-gray-400">mereview</span> {review.cafeName}</p>
                                <p className="text-gray-700 dark:text-gray-300 my-2 italic">"{review.text}"</p>
                                {review.photos && review.photos.length > 0 && (
                                    <a href={review.photos[0]} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm font-semibold">
                                        Lihat Foto
                                    </a>
                                )}
                           </div>
                           <div className="flex gap-2 flex-shrink-0 ml-4 mt-2 sm:mt-0">
                               <button onClick={() => handleUpdateStatus(review.id, 'approved')} className="bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300 px-3 py-1 rounded-lg font-semibold text-sm">Approve</button>
                               <button onClick={() => handleUpdateStatus(review.id, 'rejected')} className="bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300 px-3 py-1 rounded-lg font-semibold text-sm">Reject</button>
                           </div>
                        </div>
                         <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                            <span><span className="font-semibold text-accent-pink">Aesthetic:</span> {review.ratingAesthetic}/10</span>
                            <span><span className="font-semibold text-secondary">Nugas:</span> {review.ratingWork}/10</span>
                            <span><span className="font-semibold text-primary">Crowd Malam:</span> {review.crowdEvening}/5</span>
                            <span><span className="font-semibold">Jajan:</span> Rp{review.priceSpent.toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                ))}
            </div>
            )}
         </div>
    );
};


const AdminPage: React.FC = () => {
    const [loggedIn, setLoggedIn] = useState(false);
    const [cafes, setCafes] = useState<Cafe[]>([]);
    const [loading, setLoading] = useState(false);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCafe, setEditingCafe] = useState<Cafe | null>(null);

    const loadCafes = useCallback(async () => {
        setLoading(true);
        const data = await cafeService.getCafes();
        setCafes(data);
        setLoading(false);
    }, []);

    useEffect(() => {
        if (loggedIn) {
            loadCafes();
        }
    }, [loggedIn, loadCafes]);

    const handleSave = async (data: any) => {
        if (editingCafe) {
            await cafeService.updateCafe(editingCafe.id, data);
        } else {
            await cafeService.addCafe(data);
        }
        setIsFormOpen(false);
        setEditingCafe(null);
        loadCafes();
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Yakin mau hapus cafe ini?")) {
            await cafeService.deleteCafe(id);
            loadCafes();
        }
    };
    
    if (!loggedIn) {
        return (
            <div className="text-center py-20">
                <h1 className="text-4xl font-bold font-jakarta mb-4">Admin Dashboard</h1>
                <button onClick={() => setLoggedIn(true)} className="bg-primary text-white font-bold py-3 px-8 rounded-2xl text-lg">Login</button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-6 py-8">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-4xl font-bold font-jakarta">Manage Cafes</h1>
                <button onClick={() => { setEditingCafe(null); setIsFormOpen(true); }} className="bg-primary text-white font-bold py-2 px-6 rounded-2xl">
                    + Tambah Cafe
                </button>
            </div>

            {loading ? <p>Loading cafes...</p> : (
                <div className="bg-white dark:bg-gray-800 p-2 rounded-3xl shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b-2 border-gray-100 dark:border-gray-700">
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nama</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Kecamatan</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sponsored</th>
                                <th className="p-4 text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cafes.map(cafe => (
                                <tr key={cafe.id} className="border-b border-gray-100 dark:border-gray-700 hover:bg-primary/5 dark:hover:bg-primary/10">
                                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-200">{cafe.name}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400">{cafe.district}</td>
                                    <td className="p-4 text-gray-600 dark:text-gray-400">{cafe.isSponsored ? '✅' : '❌'}</td>
                                    <td className="p-4 space-x-4">
                                        <button onClick={() => { setEditingCafe(cafe); setIsFormOpen(true); }} className="text-primary font-bold hover:underline">Edit</button>
                                        <button onClick={() => handleDelete(cafe.id)} className="text-accent-pink font-bold hover:underline">Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <PendingReviews onAction={loadCafes} />

            {isFormOpen && <AdminCafeForm cafe={editingCafe} onSave={handleSave} onCancel={() => { setIsFormOpen(false); setEditingCafe(null); }} />}
        </div>
    );
};

export default AdminPage;