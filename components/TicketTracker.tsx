
import React, { useState } from 'react';
import { Ticket as TicketIcon, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import { TicketData } from '../types';

interface TicketTrackerProps {
    tickets?: TicketData[];
    onBack?: () => void;
}

const TicketTracker: React.FC<TicketTrackerProps> = ({ tickets = [], onBack }) => {
  const [searchId, setSearchId] = useState('');
  const [result, setResult] = useState<TicketData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    setTimeout(() => {
      // Search in props
      const found = tickets.find(t => t.id === searchId.toUpperCase());
      if (found) {
        setResult(found);
      } else {
        setError('Tiket tidak ditemukan. Pastikan ID yang Anda masukkan benar.');
      }
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch(status) {
        case 'verified': return 'bg-green-100 text-green-700 border-green-200';
        case 'investigating': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
       {/* TECH BACKGROUND: Grid + Radial Focus - Light Mode */}
       <div className="absolute inset-0 pointer-events-none bg-gray-50 dark:bg-navy-900 z-0 opacity-100 dark:opacity-0 transition-opacity">
          <div className="absolute inset-0 opacity-[0.03]"
               style={{ backgroundImage: 'linear-gradient(#1e3a8a 1px, transparent 1px), linear-gradient(90deg, #1e3a8a 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          {/* Center Glow */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/05 rounded-full blur-3xl"></div>
       </div>

       {/* TECH BACKGROUND: Grid + Radial Focus - Dark Mode (Visible White Lines) */}
       <div className="absolute inset-0 pointer-events-none bg-transparent z-0 opacity-0 dark:opacity-100 transition-opacity">
          <div className="absolute inset-0 opacity-[0.05]"
               style={{ backgroundImage: 'linear-gradient(#ffffff 1px, transparent 1px), linear-gradient(90deg, #ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
          </div>
          {/* Center Glow Dark Mode */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-400/05 rounded-full blur-3xl"></div>
       </div>

      <div className="max-w-4xl mx-auto relative z-10 pb-12">
        
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

        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 text-blue-900 rounded-2xl mb-4 shadow-inner animate-bounce-in">
              <TicketIcon size={32} />
          </div>
          <h2 className="text-3xl font-bold text-navy-900 dark:text-white">Lacak Status Laporan</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-2">Masukkan ID Tiket yang Anda dapatkan saat melapor.</p>
        </div>

        {/* Search Box with Strong Focus */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto relative mb-12 group">
          <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
          <div className="relative">
              <input 
                type="text" 
                placeholder="Contoh: TIKET-8821"
                className="w-full pl-5 pr-16 py-4 rounded-2xl border border-gray-300 dark:border-navy-600 focus:border-blue-900 dark:focus:border-blue-500 focus:ring-4 focus:ring-blue-900/10 text-lg font-mono uppercase shadow-2xl outline-none transition bg-white dark:bg-navy-800 text-gray-900 dark:text-white placeholder-gray-400"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
              />
              <button 
                type="submit"
                disabled={loading}
                className="absolute right-2 top-2 bottom-2 bg-blue-900 text-white px-4 rounded-xl hover:bg-blue-800 transition disabled:bg-gray-400 shadow-lg"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Search size={20} />}
              </button>
          </div>
        </form>

        {/* Result Display */}
        {error && (
          <div className="max-w-lg mx-auto p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 animate-shake shadow-md">
              <AlertCircle size={20} />
              {error}
          </div>
        )}

        {result && (
          <div className="bg-white dark:bg-navy-800 rounded-3xl shadow-xl border border-gray-100 dark:border-navy-700 overflow-hidden animate-fade-in-up">
              <div className="bg-navy-900 dark:bg-black p-6 sm:p-8 text-white flex justify-between items-start">
                  <div>
                      <p className="text-blue-200 text-sm font-medium mb-1">ID Tiket</p>
                      <h3 className="text-3xl font-mono font-bold">{result.id}</h3>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border text-sm font-bold uppercase tracking-wide ${getStatusColor(result.status)}`}>
                      {result.status === 'investigating' ? 'Sedang Diproses' : result.status}
                  </div>
              </div>

              <div className="p-6 sm:p-8">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-lg">Riwayat Proses</h4>
                  <div className="relative border-l-2 border-gray-200 dark:border-navy-600 ml-3 space-y-8 pb-4">
                      {result.history.map((hist: any, idx: number) => (
                          <div key={idx} className="relative pl-8">
                              <div className="absolute -left-[9px] top-0 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-navy-800 shadow-sm"></div>
                              <p className="text-sm text-gray-400 font-medium mb-1">{hist.date}</p>
                              <p className="text-gray-800 dark:text-gray-200 font-medium">{hist.note}</p>
                          </div>
                      ))}
                  </div>
                  
                  <div className="mt-8 p-5 bg-gray-50 dark:bg-navy-900 rounded-xl border border-gray-100 dark:border-navy-700">
                      <h5 className="font-bold text-gray-700 dark:text-gray-300 mb-2 text-sm uppercase">Detail Laporan</h5>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                              <span className="text-gray-400 block">Kategori</span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{result.reportData.category}</span>
                          </div>
                          <div>
                              <span className="text-gray-400 block">Nama Pelapor</span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium">{result.reportData.name.charAt(0) + '***'} (Disamarkan)</span>
                          </div>
                           <div className="col-span-full">
                              <span className="text-gray-400 block">Isi Laporan</span>
                              <span className="text-gray-800 dark:text-gray-200 font-medium italic">"{result.reportData.content}"</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TicketTracker;
