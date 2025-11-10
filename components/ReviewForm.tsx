import React, { useState } from 'react';
import { Review } from '../types';
import { cloudinaryService } from '../services/cloudinaryService';
import { fileToBase64 } from '../utils/fileUtils';

interface ReviewFormProps {
    onSubmit: (review: Omit<Review, 'id' | 'createdAt' | 'status'>) => void;
    isSubmitting: boolean;
}

const ReviewForm: React.FC<ReviewFormProps> = ({ onSubmit, isSubmitting }) => {
    const [author, setAuthor] = useState('');
    const [text, setText] = useState('');
    const [ratingAesthetic, setRatingAesthetic] = useState(8);
    const [ratingWork, setRatingWork] = useState(8);
    const [crowdMorning, setCrowdMorning] = useState(3);
    const [crowdAfternoon, setCrowdAfternoon] = useState(3);
    const [crowdEvening, setCrowdEvening] = useState(3);
    const [priceSpent, setPriceSpent] = useState('');
    const [photo, setPhoto] = useState<string | null>(null); // Store as base64 string
    const [photoName, setPhotoName] = useState('');
    const [isUploading, setIsUploading] = useState(false);


    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setPhotoName(file.name);
            try {
                const base64 = await fileToBase64(file);
                setPhoto(base64);
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Gagal memproses file. Silakan coba file lain.");
                setPhoto(null);
                setPhotoName('');
            }
        }
    };

    const resetForm = () => {
        setAuthor('');
        setText('');
        setRatingAesthetic(8);
        setRatingWork(8);
        setCrowdMorning(3);
        setCrowdAfternoon(3);
        setCrowdEvening(3);
        setPriceSpent('');
        setPhoto(null);
        setPhotoName('');
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
                setIsUploading(false);
                return;
            }
            setIsUploading(false);
        }

        onSubmit({
            author,
            text,
            ratingAesthetic,
            ratingWork,
            crowdMorning,
            crowdAfternoon,
            crowdEvening,
            priceSpent: Number(priceSpent) || 0,
            photos: uploadedPhotoUrl ? [uploadedPhotoUrl] : [],
        });
        resetForm();
    };
    
    const totalSubmitting = isSubmitting || isUploading;
    
    return (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm space-y-4">
            <h3 className="text-xl font-bold font-jakarta">Beri Review Kamu!</h3>
            
            <input type="text" placeholder="Nama Kamu" value={author} onChange={e => setAuthor(e.target.value)} required className="w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" />
            <textarea placeholder="Ceritain pengalamanmu..." value={text} onChange={e => setText(e.target.value)} required className="w-full p-3 border rounded-xl h-24 text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"></textarea>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="font-semibold block mb-1">Skor Aesthetic ({ratingAesthetic})</label>
                    <input type="range" min="1" max="10" value={ratingAesthetic} onChange={e => setRatingAesthetic(parseInt(e.target.value))} className="w-full accent-accent-pink"/>
                </div>
                <div>
                    <label className="font-semibold block mb-1">Skor Nugas ({ratingWork})</label>
                    <input type="range" min="1" max="10" value={ratingWork} onChange={e => setRatingWork(parseInt(e.target.value))} className="w-full accent-secondary"/>
                </div>
            </div>

            <div>
                <label className="font-semibold block mb-1">Tingkat Keramaian</label>
                <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    <div>
                        Pagi ({crowdMorning}): <input type="range" min="1" max="5" value={crowdMorning} onChange={e => setCrowdMorning(parseInt(e.target.value))} className="w-full accent-amber-400"/>
                    </div>
                     <div>
                        Siang ({crowdAfternoon}): <input type="range" min="1" max="5" value={crowdAfternoon} onChange={e => setCrowdAfternoon(parseInt(e.target.value))} className="w-full accent-primary/75"/>
                    </div>
                     <div>
                        Malam ({crowdEvening}): <input type="range" min="1" max="5" value={crowdEvening} onChange={e => setCrowdEvening(parseInt(e.target.value))} className="w-full accent-primary"/>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                 <div>
                    <label htmlFor="price-spent-input" className="font-semibold block mb-1">Total Jajan (Rp)</label>
                    <input
                        id="price-spent-input"
                        type="number" 
                        placeholder="Contoh: 50000" 
                        value={priceSpent}
                        onChange={e => setPriceSpent(e.target.value)}
                        className="w-full p-3 border rounded-xl text-gray-800 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                 </div>
                 <div>
                    <label className="font-semibold block mb-1">Foto (Opsional)</label>
                    <label htmlFor="photo-upload" className="w-full text-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-xl border-2 border-dashed dark:border-gray-600 block hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                        {photoName ? `✔️ ${photoName}` : '📸 Pilih Foto'}
                    </label>
                    <input id="photo-upload" type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </div>
            </div>
             {photo && <img src={photo} alt="Preview" className="mt-2 rounded-lg max-h-40 mx-auto" />}
            
            <button type="submit" disabled={totalSubmitting} className="w-full bg-primary text-white font-bold py-3 rounded-2xl hover:bg-primary/90 transition-all disabled:bg-primary/50 disabled:cursor-not-allowed">
                {isUploading ? 'Uploading Foto...' : (isSubmitting ? 'Mengirim...' : 'Kirim Review')}
            </button>
        </form>
    );
};

export default ReviewForm;