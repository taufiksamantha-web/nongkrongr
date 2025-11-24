
import React, { useState } from 'react';
import { CATEGORIES } from '../constants';
import { Upload, Send, CheckCircle, ArrowLeft, X, Image as ImageIcon } from 'lucide-react';
import Captcha from './Captcha';
import { ReportFormData, TicketData } from '../types';
import { uploadToCloudinary } from '../services/cloudinaryService';

interface ReportFormProps {
  onBack: () => void;
  onSubmitSuccess?: (ticketId: string) => void;
  onAddTicket?: (ticket: TicketData) => void; // Added Prop to lift state up
}

// Helper function untuk format waktu Indonesia yang PASTI BENAR
// Menghindari bug '0' pada beberapa browser mobile
const getIndonesianTimestamp = () => {
  const now = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  
  const day = now.getDate();
  const month = months[now.getMonth()];
  const year = now.getFullYear();
  
  // PadStart memastikan ada angka 0 di depan jika di bawah 10 (misal: 09:05)
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year}, Pukul ${hours}:${minutes} WIB`;
};

const ReportForm: React.FC<ReportFormProps> = ({ onBack, onSubmitSuccess, onAddTicket }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [ticketId, setTicketId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<ReportFormData>({
    name: '',
    email: '',
    phone: '',
    category: CATEGORIES[0],
    content: '',
    evidence: null
  });

  // Local state for file preview
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setFormData({ ...formData, evidence: file });
        setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemoveFile = () => {
      setFormData({ ...formData, evidence: null });
      setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isVerified) return;

    setIsSubmitting(true);
    
    try {
        let uploadedEvidenceUrl = '';

        // Upload Image to Cloudinary if exists
        if (formData.evidence) {
            try {
                uploadedEvidenceUrl = await uploadToCloudinary(formData.evidence);
            } catch (err) {
                console.error("Failed to upload image, proceeding without it");
            }
        }

        // Generate Random Ticket ID
        const newTicketId = `TIKET-${Math.floor(1000 + Math.random() * 9000)}`;
        
        // Gunakan timestamp manual yang aman
        const currentTimestamp = getIndonesianTimestamp();

        // Create actual ticket object
        const newTicket: TicketData = {
            id: newTicketId,
            reportData: { 
                ...formData,
                evidenceUrl: uploadedEvidenceUrl 
            },
            status: 'pending',
            submissionDate: new Date().toISOString().split('T')[0], // Tanggal untuk sorting database
            history: [
                { date: currentTimestamp, note: 'Laporan diterima oleh sistem.' }
            ]
        };

        // Call Parent Function to update state
        if (onAddTicket) {
            onAddTicket(newTicket);
        }

        setTicketId(newTicketId);
        if (onSubmitSuccess) onSubmitSuccess(newTicketId);
    } catch (error) {
        alert("Terjadi kesalahan saat mengirim laporan.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (ticketId) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white dark:bg-navy-800 rounded-2xl shadow-lg text-center border border-green-100 dark:border-navy-700 animate-fade-in-up relative z-10">
        <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle size={40} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Laporan Diterima!</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed text-sm">
            Simpan kode tiket ini untuk melacak status laporan Anda melalui menu "Lacak Tiket".
        </p>
        
        <div className="bg-blue-50 dark:bg-navy-900 border border-blue-200 dark:border-blue-800 border-dashed rounded-xl p-4 mb-8">
            <p className="text-xs text-blue-600 dark:text-blue-400 uppercase tracking-wider font-bold mb-1">Kode Tiket Anda</p>
            <p className="text-3xl font-mono font-black text-blue-900 dark:text-blue-100">{ticketId}</p>
        </div>

        <div className="space-y-3">
            <button 
            onClick={() => { setTicketId(null); setFormData({ name:'', email:'', phone:'', content:'', category: CATEGORIES[0], evidence: null }); setPreviewUrl(null); setIsVerified(false); }}
            className="w-full py-3 bg-blue-900 dark:bg-blue-700 text-white font-bold rounded-xl hover:bg-blue-800 dark:hover:bg-blue-600 transition shadow-lg shadow-blue-900/20"
            >
            Buat Laporan Baru
            </button>
            <button 
            onClick={onBack}
            className="w-full py-3 bg-white dark:bg-navy-700 text-gray-600 dark:text-gray-200 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-navy-600 transition"
            >
            Kembali ke Beranda
            </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen">
        {/* DIAGONAL STRIPED BACKGROUND - Made subtle */}
        <div className="absolute inset-0 pointer-events-none z-0 bg-gray-50 dark:bg-navy-900">
            <div className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
                 style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1e3a8a 0, #1e3a8a 1px, transparent 0, transparent 50%)', backgroundSize: '10px 10px' }}>
            </div>
        </div>

        <div className="max-w-3xl mx-auto relative z-10">
            <div className="flex items-center gap-4 mb-8">
                <button 
                    onClick={onBack}
                    className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-navy-800 transition text-gray-600 dark:text-gray-300 bg-white dark:bg-navy-800 shadow-sm"
                    aria-label="Kembali"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Formulir Lapor Hoax</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Identitas pelapor kami lindungi. Bantu kami menjaga Sumsel.</p>
                </div>
            </div>

        <form onSubmit={handleSubmit} className="bg-white dark:bg-navy-800 p-6 sm:p-10 rounded-3xl shadow-2xl border border-gray-100 dark:border-navy-700 relative overflow-hidden">
            {/* Form Decorative Top Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500"></div>
            
            <div className="space-y-6 relative z-10">
            
            {/* Personal Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nama Lengkap</label>
                    <input 
                    type="text" 
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-gray-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white"
                    placeholder="Nama Anda"
                    />
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">No. Handphone / WA</label>
                    <input 
                    type="tel" 
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-gray-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white"
                    placeholder="0812..."
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email (Opsional)</label>
                <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-gray-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white"
                    placeholder="email@example.com"
                />
            </div>

            {/* Report Content */}
            <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Isi Laporan / Berita <span className="text-red-500">*</span></label>
                <textarea 
                name="content"
                value={formData.content}
                onChange={handleChange}
                required
                rows={4}
                placeholder="Jelaskan berita hoax yang Anda temukan, sertakan link jika ada..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition resize-none bg-gray-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white"
                ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Kategori</label>
                    <div className="relative">
                        <select 
                            name="category"
                            value={formData.category}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-navy-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition bg-gray-50 dark:bg-navy-900 focus:bg-white dark:focus:bg-navy-900 text-gray-900 dark:text-white appearance-none cursor-pointer"
                        >
                        {CATEGORIES.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Screenshot (Opsional)</label>
                    
                    {!previewUrl ? (
                        <div className="border-2 border-dashed border-gray-300 dark:border-navy-600 rounded-xl p-3 text-center hover:bg-blue-50 dark:hover:bg-navy-900 hover:border-blue-300 transition cursor-pointer group h-[50px] relative flex items-center justify-center">
                            <div className="flex items-center gap-2 pointer-events-none">
                                <Upload className="w-4 h-4 text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" />
                                <span className="text-sm text-gray-500 font-medium group-hover:text-blue-600 dark:group-hover:text-blue-400">Upload Bukti</span>
                            </div>
                            <input 
                                type="file" 
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                        </div>
                    ) : (
                        <div className="relative h-[50px] flex items-center gap-3 bg-gray-100 dark:bg-navy-900 rounded-xl px-3 border border-gray-200 dark:border-navy-600">
                            <img src={previewUrl} alt="Preview" className="h-8 w-8 object-cover rounded-lg" />
                            <span className="text-xs text-gray-600 dark:text-gray-300 truncate flex-1">{formData.evidence?.name}</span>
                            <button type="button" onClick={handleRemoveFile} className="text-red-500 hover:bg-red-100 p-1 rounded-full transition">
                                <X size={16} />
                            </button>
                        </div>
                    )}

                </div>
            </div>

            {/* Captcha */}
            <Captcha onVerify={(valid) => setIsVerified(valid)} />

            {/* Submit Button */}
            <div className="flex gap-4 pt-2">
                <button 
                    type="button"
                    onClick={onBack}
                    className="px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-navy-700 hover:bg-gray-200 dark:hover:bg-navy-600 transition"
                >
                    Batal
                </button>
                <button 
                    type="submit" 
                    disabled={isSubmitting || !isVerified}
                    className={`flex-1 py-3 rounded-xl font-bold text-white flex items-center justify-center space-x-2 transition shadow-xl shadow-blue-900/20
                    ${(isSubmitting || !isVerified) ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed shadow-none' : 'bg-blue-900 dark:bg-blue-700 hover:bg-blue-800 dark:hover:bg-blue-600 hover:-translate-y-1'}
                    `}
                >
                    {isSubmitting ? (
                    <span>Mengirim Data...</span>
                    ) : (
                    <>
                        <Send size={18} />
                        <span>Kirim Laporan</span>
                    </>
                    )}
                </button>
            </div>

            </div>
        </form>
        </div>
    </div>
  );
};

export default ReportForm;
