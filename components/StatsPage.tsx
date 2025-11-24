

import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, PieChart, Activity, Users, FileText, CheckCircle, Download, Loader2, ArrowLeft } from 'lucide-react';
import { NewsItem, NewsStatus, TicketData } from '../types';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

interface StatsPageProps {
    newsData: NewsItem[];
    tickets?: TicketData[];
    onBack?: () => void;
}

const StatsPage: React.FC<StatsPageProps> = ({ newsData, tickets = [], onBack }) => {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUpdated, setIsUpdated] = useState(false);

  // Efek visual saat data berubah (Realtime Pulse)
  useEffect(() => {
      if (newsData.length > 0) {
          setIsUpdated(true);
          const timer = setTimeout(() => setIsUpdated(false), 1000);
          return () => clearTimeout(timer);
      }
  }, [newsData.length, newsData]); // Trigger jika jumlah atau konten data berubah
  
  // --- Kumpulan Logika Kalkulasi Data Real-time ---
  
  // 1. Hitung Total Berdasarkan Status
  const stats = useMemo(() => {
    const total = newsData.length;
    const hoax = newsData.filter(n => n.status === NewsStatus.HOAX).length;
    const fakta = newsData.filter(n => n.status === NewsStatus.FAKTA).length;
    const disinformasi = newsData.filter(n => n.status === NewsStatus.DISINFORMASI).length;
    
    // Hitung persentase Hoax dari total (untuk grafik lingkaran)
    const hoaxPercentage = total > 0 ? Math.round((hoax / total) * 100) : 0;

    return { total, hoax, fakta, disinformasi, hoaxPercentage };
  }, [newsData]);

  // 2. Hitung Total Views (Partisipasi Pembaca)
  const totalViews = useMemo(() => {
      return newsData.reduce((acc, curr) => acc + (curr.viewCount || 0), 0);
  }, [newsData]);

  // 3. Hitung Topik Terpopuler (Berdasarkan Tags)
  const topTopics = useMemo(() => {
    const topicCounts: Record<string, number> = {};
    
    newsData.forEach(item => {
        item.tags.forEach(tag => {
            // Normalisasi tag (misal: "Bansos" dan "bansos" dianggap sama)
            const normalizedTag = tag.trim(); 
            if (normalizedTag !== 'Sumsel' && normalizedTag !== 'Umum') { // Filter tag umum
                topicCounts[normalizedTag] = (topicCounts[normalizedTag] || 0) + 1;
            }
        });
    });

    // Convert ke array, sort descending, ambil top 4
    const sortedTopics = Object.entries(topicCounts)
        .sort(([, countA], [, countB]) => countB - countA)
        .slice(0, 4)
        .map(([label, val]) => ({ label, val }));

    // Cari nilai tertinggi untuk kalkulasi width bar
    const maxVal = sortedTopics.length > 0 ? sortedTopics[0].val : 1;

    return sortedTopics.map(t => ({
        ...t,
        percent: Math.round((t.val / maxVal) * 100), // Persentase relatif terhadap nilai tertinggi (biar bar penuh)
        color: 'bg-blue-600' // Bisa dibuat dinamis kalau mau warna-warni
    }));
  }, [newsData]);

  // 4. Fungsi Generate PDF
  const handleDownloadPDF = () => {
    setIsGeneratingPdf(true);
    setTimeout(() => {
        try {
            // Use 'any' to bypass TypeScript definition issues with jspdf plugins
            const doc: any = new jsPDF();
            const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            // HEADER
            doc.setFillColor(30, 58, 138); // Navy Blue
            doc.rect(0, 0, 210, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(22);
            doc.text("Laporan Bulanan SumselCekFakta", 105, 20, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Dicetak pada: ${today}`, 105, 30, { align: 'center' });

            // SUMMARY BOXES
            doc.setTextColor(0, 0, 0);
            
            // Total Articles
            doc.setFillColor(240, 240, 240);
            doc.rect(14, 50, 55, 30, 'F');
            doc.setFontSize(10); doc.text("Total Artikel", 41, 60, { align: 'center' });
            doc.setFontSize(16); doc.text(stats.total.toString(), 41, 70, { align: 'center' });

            // Total Hoax
            doc.setFillColor(254, 226, 226); // Light Red
            doc.rect(77, 50, 55, 30, 'F');
            doc.setFontSize(10); doc.text("Hoax Teridentifikasi", 104, 60, { align: 'center' });
            doc.setFontSize(16); doc.setTextColor(220, 38, 38); doc.text(stats.hoax.toString(), 104, 70, { align: 'center' });
            
            // Total Fakta
            doc.setTextColor(0, 0, 0);
            doc.setFillColor(220, 252, 231); // Light Green
            doc.rect(140, 50, 55, 30, 'F');
            doc.setFontSize(10); doc.text("Fakta Terverifikasi", 167, 60, { align: 'center' });
            doc.setFontSize(16); doc.setTextColor(22, 163, 74); doc.text(stats.fakta.toString(), 167, 70, { align: 'center' });

            // TABLE
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(12);
            doc.text("Rincian Berita Terbaru", 14, 95);

            const tableData = newsData.slice(0, 50).map((item, idx) => [
                idx + 1,
                item.title,
                item.status,
                item.date,
                item.viewCount || 0
            ]);

            doc.autoTable({
                startY: 100,
                head: [['No', 'Judul Berita', 'Status', 'Tanggal', 'Views']],
                body: tableData,
                headStyles: { fillColor: [30, 58, 138] },
                styles: { fontSize: 8 },
                columnStyles: {
                    0: { cellWidth: 10 },
                    1: { cellWidth: 'auto' }, // Judul
                    2: { cellWidth: 25 }, // Status
                    3: { cellWidth: 25 }, // Tanggal
                    4: { cellWidth: 15, halign: 'center' }  // Views
                }
            });

            // FOOTER
            const pageCount = doc.getNumberOfPages();
            for(let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.text('Dokumen ini dibuat secara otomatis oleh sistem SumselCekFakta.', 105, 290, { align: 'center' });
            }

            doc.save(`Laporan_SumselCekFakta_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (err) {
            console.error(err);
            alert("Gagal membuat PDF.");
        } finally {
            setIsGeneratingPdf(false);
        }
    }, 500);
  };


  return (
    <div className="relative w-full min-h-screen overflow-hidden">
      {/* STRONG GRID PATTERN BACKGROUND - Light Mode */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-0 transition-opacity duration-300"
        style={{
            backgroundImage: 'linear-gradient(#1e3a8a 2px, transparent 2px), linear-gradient(90deg, #1e3a8a 2px, transparent 2px)',
            backgroundSize: '50px 50px'
        }}>
      </div>
       {/* STRONG GRID PATTERN BACKGROUND - Dark Mode (Visible White) */}
       <div className="absolute inset-0 pointer-events-none opacity-0 dark:opacity-[0.05] transition-opacity duration-300"
        style={{
            backgroundImage: 'linear-gradient(#ffffff 2px, transparent 2px), linear-gradient(90deg, #ffffff 2px, transparent 2px)',
            backgroundSize: '50px 50px'
        }}>
      </div>

      {/* ABSTRACT CHART DECORATION */}
      <div className="absolute top-20 right-0 w-96 h-96 opacity-10 pointer-events-none">
          <div className="flex items-end justify-center gap-4 h-full transform skew-y-12">
               <div className="w-12 h-[40%] bg-blue-600 rounded-t-lg"></div>
               <div className="w-12 h-[70%] bg-navy-900 rounded-t-lg"></div>
               <div className="w-12 h-[50%] bg-blue-400 rounded-t-lg"></div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10 px-4 sm:px-6 lg:px-8">
        {onBack && (
            <div className="mb-8">
                <button 
                onClick={onBack}
                className="group flex items-center gap-2 text-gray-500 hover:text-blue-900 dark:text-gray-400 dark:hover:text-blue-400 transition"
                >
                <div className="p-2 rounded-full bg-white dark:bg-navy-800 border border-gray-200 dark:border-navy-700 group-hover:border-blue-300 shadow-sm">
                    <ArrowLeft size={20} />
                </div>
                <span className="font-medium">Kembali ke Beranda</span>
                </button>
            </div>
        )}

        <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full font-bold text-sm mb-4 shadow-sm">
                <Activity size={16} className={`text-green-500 ${isUpdated ? 'animate-bounce' : 'animate-pulse'}`} /> 
                <span className={isUpdated ? 'text-green-600 transition-colors duration-300' : ''}>Data Real-time</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-navy-900 dark:text-white mb-4">Statistik SumselCekFakta</h2>
            <p className="text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                Data transparan mengenai sebaran isu hoax dan klarifikasi yang telah diverifikasi oleh tim kami dari total <strong>{stats.total}</strong> artikel database.
            </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            
            {/* CARD 1: Total Artikel Database */}
            <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-lg border border-blue-100 dark:border-navy-700 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition group-hover:opacity-20">
                    <FileText size={80} className="text-blue-900 dark:text-white" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Artikel Terverifikasi</p>
                
                <h3 className={`text-5xl font-extrabold transition-all duration-500 ${isUpdated ? 'text-blue-600 scale-110' : 'text-navy-900 dark:text-white'}`}>
                    {stats.total.toLocaleString()}
                </h3>
                
                <div className="mt-4 text-sm text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1 bg-blue-50 dark:bg-navy-900 w-fit px-3 py-1 rounded-lg">
                    <CheckCircle size={14} />
                    <span>Database Lengkap</span>
                </div>
            </div>

            {/* CARD 2: Statistik Hoax */}
            <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-lg border border-red-100 dark:border-navy-700 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition group-hover:opacity-20">
                    <PieChart size={80} className="text-red-600" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Hoaks Teridentifikasi</p>
                
                <h3 className={`text-5xl font-extrabold transition-all duration-500 ${isUpdated ? 'text-red-500 scale-110' : 'text-red-600'}`}>
                    {stats.hoax.toLocaleString()}
                </h3>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 dark:bg-navy-900 h-2 rounded-full mt-4 overflow-hidden">
                    <div className="bg-red-600 h-full transition-all duration-1000 ease-out" style={{ width: `${stats.hoaxPercentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-400 mt-2 flex justify-between">
                    <span>{stats.hoaxPercentage}% dari total artikel</span>
                    <span className="text-red-400 font-bold">Waspada!</span>
                </p>
            </div>

            {/* CARD 3: Partisipasi (Total Views) */}
            <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-lg border border-green-100 dark:border-navy-700 relative overflow-hidden group hover:-translate-y-1 transition duration-300">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition group-hover:opacity-20">
                    <Users size={80} className="text-green-600" />
                </div>
                <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">Total Jangkauan Pembaca</p>
                
                <h3 className={`text-5xl font-extrabold transition-all duration-500 ${isUpdated ? 'text-green-500 scale-110' : 'text-green-600'}`}>
                    {totalViews.toLocaleString()}
                </h3>
                
                <div className="mt-4 text-sm text-green-700 dark:text-green-400 font-bold flex items-center gap-1 bg-green-50 dark:bg-navy-900 w-fit px-3 py-1 rounded-lg">
                    <span>Masyarakat Terdukasi</span>
                </div>
            </div>
        </div>

        {/* Top Topics & Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Topic Charts */}
            <div className="bg-white dark:bg-navy-800 p-8 rounded-3xl shadow-md border border-gray-100 dark:border-navy-700">
                <h4 className="font-bold text-xl text-navy-900 dark:text-white mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-blue-600" /> Topik Paling Sering Muncul
                </h4>
                <div className="space-y-6">
                    {topTopics.map((item, idx) => (
                        <div key={idx} className="group">
                            <div className="flex justify-between text-sm font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                                <span className="group-hover:text-blue-600 transition capitalize">{item.label}</span>
                                <span className="text-gray-400 text-xs font-normal bg-gray-100 dark:bg-navy-700 px-2 py-0.5 rounded">{item.val} Artikel</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-navy-900 rounded-full h-3 overflow-hidden">
                                <div 
                                    className={`h-full rounded-full ${idx === 0 ? 'bg-red-500' : idx === 1 ? 'bg-orange-500' : idx === 2 ? 'bg-blue-500' : 'bg-green-500'} transition-all duration-1000 ease-out group-hover:opacity-80`} 
                                    style={{ width: `${item.percent}%` }}
                                ></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Call to Action Box */}
            <div className="bg-gradient-to-br from-navy-900 to-blue-900 p-8 rounded-3xl shadow-xl text-white flex flex-col justify-center items-center text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                <div className="relative z-10">
                    <h4 className="font-bold text-2xl mb-4">Kontribusi Anda Penting!</h4>
                    <p className="text-blue-100 mb-8 leading-relaxed">
                        Statistik ini terbentuk dari laporan masyarakat dan hasil verifikasi tim kami. Semakin aktif Anda melapor, semakin akurat peta sebaran hoax di Sumatera Selatan.
                    </p>
                    <div className="grid grid-cols-2 gap-4 w-full mb-6">
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <p className={`text-2xl font-bold transition-all ${isUpdated ? 'scale-125 text-green-300' : ''}`}>{stats.fakta}</p>
                            <p className="text-xs text-blue-200 uppercase tracking-wide">Fakta Valid</p>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
                            <p className={`text-2xl font-bold transition-all ${isUpdated ? 'scale-125 text-yellow-300' : ''}`}>{stats.disinformasi}</p>
                            <p className="text-xs text-blue-200 uppercase tracking-wide">Disinformasi</p>
                        </div>
                    </div>
                    <button 
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPdf}
                        className="bg-white text-blue-900 px-6 py-3 rounded-xl font-bold hover:bg-blue-50 transition shadow-lg w-full sm:w-auto flex items-center justify-center gap-2 disabled:opacity-70"
                    >
                        {isGeneratingPdf ? <Loader2 className="animate-spin" /> : <Download size={20} />}
                        {isGeneratingPdf ? 'Memproses PDF...' : 'Download Laporan Bulanan (PDF)'}
                    </button>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default StatsPage;
