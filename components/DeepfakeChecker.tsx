import React, { useState, useRef } from 'react';
import { UploadCloud, ScanFace, AlertTriangle, CheckCircle, X, ShieldCheck, Cpu, Image as ImageIcon, Loader2, ArrowLeft } from 'lucide-react';
import { analyzeImageForDeepfake } from '../services/geminiService';

interface DeepfakeCheckerProps {
    onBack: () => void;
}

const DeepfakeChecker: React.FC<DeepfakeCheckerProps> = ({ onBack }) => {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                setSelectedImage(reader.result as string);
                setResult(null); // Reset result
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!selectedImage) return;

        setIsAnalyzing(true);
        try {
            // Simulate scanning delay for UX effect
            await new Promise(resolve => setTimeout(resolve, 1500));
            const analysisResult = await analyzeImageForDeepfake(selectedImage);
            setResult(analysisResult);
        } catch (error) {
            alert("Gagal menganalisis gambar.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score > 70) return 'text-red-500'; // High AI probability
        if (score > 40) return 'text-yellow-500'; // Suspicious
        return 'text-green-500'; // Likely Real
    };

    const getScoreBg = (score: number) => {
        if (score > 70) return 'bg-red-500';
        if (score > 40) return 'bg-yellow-500';
        return 'bg-green-500';
    };

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-navy-900 relative overflow-hidden">
            
            {/* Background Tech Elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-30 dark:opacity-20">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/20 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/20 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button 
                        onClick={onBack}
                        className="p-3 rounded-full bg-white dark:bg-navy-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-700 transition shadow-sm"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-extrabold text-navy-900 dark:text-white flex items-center gap-2">
                            <ScanFace className="text-purple-600" /> AI Media Lab
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Deteksi manipulasi gambar dan deepfake menggunakan kecerdasan buatan.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Left Col: Upload Area */}
                    <div className="space-y-6">
                        <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 shadow-xl border border-gray-100 dark:border-navy-700">
                            
                            {!selectedImage ? (
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-3 border-dashed border-gray-300 dark:border-navy-600 rounded-2xl h-80 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-navy-900/50 hover:border-purple-400 transition-all group"
                                >
                                    <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition">
                                        <UploadCloud size={40} className="text-purple-600 dark:text-purple-400" />
                                    </div>
                                    <p className="font-bold text-gray-700 dark:text-gray-200">Klik untuk Upload Gambar</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center px-4">
                                        Mendukung JPG, PNG. <br/>(Video & Audio segera hadir)
                                    </p>
                                    <input 
                                        type="file" 
                                        ref={fileInputRef} 
                                        onChange={handleFileChange} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                </div>
                            ) : (
                                <div className="relative rounded-2xl overflow-hidden h-80 bg-black group">
                                    <img src={selectedImage} alt="Preview" className="w-full h-full object-contain" />
                                    
                                    {/* Scanning Animation Layer */}
                                    {isAnalyzing && (
                                        <div className="absolute inset-0 z-20 pointer-events-none">
                                            <div className="w-full h-1 bg-purple-500/80 shadow-[0_0_15px_rgba(168,85,247,0.8)] absolute top-0 animate-[scan_2s_linear_infinite]"></div>
                                            <div className="absolute inset-0 bg-purple-500/10 animate-pulse"></div>
                                            <div className="absolute bottom-4 left-0 w-full text-center text-white font-mono text-sm tracking-widest font-bold">
                                                MENGANALISIS PIKSEL...
                                            </div>
                                        </div>
                                    )}

                                    {!isAnalyzing && (
                                        <button 
                                            onClick={() => setSelectedImage(null)}
                                            className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full hover:bg-red-600 transition backdrop-blur-md"
                                        >
                                            <X size={20} />
                                        </button>
                                    )}
                                </div>
                            )}

                            <button
                                onClick={handleAnalyze}
                                disabled={!selectedImage || isAnalyzing}
                                className={`w-full mt-6 py-4 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
                                ${!selectedImage || isAnalyzing 
                                    ? 'bg-gray-400 cursor-not-allowed' 
                                    : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 hover:-translate-y-1 shadow-purple-600/30'}
                                `}
                            >
                                {isAnalyzing ? <Loader2 size={24} className="animate-spin" /> : <Cpu size={24} />}
                                {isAnalyzing ? 'Sedang Memproses...' : 'Cek Keaslian Gambar'}
                            </button>
                        </div>
                        
                        <div className="bg-blue-50 dark:bg-navy-900/50 p-4 rounded-xl border border-blue-100 dark:border-navy-700 flex gap-3 items-start">
                            <AlertTriangle className="text-blue-600 shrink-0 mt-0.5" size={20} />
                            <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                                <strong>Catatan:</strong> Hasil analisis ini menggunakan AI untuk mendeteksi pola generatif. Hasil tidak 100% akurat dan sebaiknya digunakan sebagai referensi awal, bukan bukti hukum mutlak.
                            </p>
                        </div>
                    </div>

                    {/* Right Col: Result Area */}
                    <div className="space-y-6">
                        {result ? (
                            <div className="bg-white dark:bg-navy-800 rounded-3xl p-6 md:p-8 shadow-xl border border-gray-100 dark:border-navy-700 animate-fade-in-up h-full flex flex-col">
                                <div className="text-center mb-8">
                                    <p className="text-gray-500 dark:text-gray-400 text-sm font-bold uppercase tracking-widest mb-2">Probabilitas AI</p>
                                    
                                    {/* Score Gauge */}
                                    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
                                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                            {/* Background Circle */}
                                            <path
                                                className="text-gray-100 dark:text-navy-900"
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            {/* Progress Circle */}
                                            <path
                                                className={`${getScoreColor(result.score)} transition-all duration-1000 ease-out`}
                                                strokeDasharray={`${result.score}, 100`}
                                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                        </svg>
                                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                                            <span className={`text-4xl font-black ${getScoreColor(result.score)}`}>{result.score}%</span>
                                        </div>
                                    </div>
                                    
                                    <h2 className={`text-2xl font-bold mt-4 ${getScoreColor(result.score)}`}>
                                        {result.verdict}
                                    </h2>
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="bg-gray-50 dark:bg-navy-900 rounded-xl p-4">
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                                            <ScanFace size={16} /> Analisis Detektif AI:
                                        </h3>
                                        <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                                            "{result.reason}"
                                        </p>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Indikator Terdeteksi:</h3>
                                        <ul className="space-y-2">
                                            {result.flags && result.flags.length > 0 ? result.flags.map((flag: string, idx: number) => (
                                                <li key={idx} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400 bg-white dark:bg-black/20 p-2 rounded-lg border border-gray-100 dark:border-navy-700">
                                                    <span className={`mt-1 w-2 h-2 rounded-full ${result.score > 50 ? 'bg-red-400' : 'bg-green-400'}`}></span>
                                                    {flag}
                                                </li>
                                            )) : (
                                                <li className="text-sm text-gray-400 italic">Tidak ada anomali signifikan ditemukan.</li>
                                            )}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-8 bg-white/50 dark:bg-navy-800/50 rounded-3xl border border-dashed border-gray-300 dark:border-navy-700">
                                <div className="w-24 h-24 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <ShieldCheck size={48} className="text-purple-400" />
                                </div>
                                <h3 className="text-xl font-bold text-navy-900 dark:text-white mb-2">Siap Menganalisis</h3>
                                <p className="text-gray-500 dark:text-gray-400 max-w-xs">
                                    Upload gambar di sebelah kiri dan biarkan AI kami membedah setiap pikselnya untuk Anda.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeepfakeChecker;