
import React from 'react';
import { ArrowLeft, ShieldCheck, Lock, Eye, FileText } from 'lucide-react';
import { SEO } from '../components/SEO';
import { Button, GlassCard } from '../components/UI';

interface PrivacyPolicyViewProps {
  onBack: () => void;
}

export const PrivacyPolicyView: React.FC<PrivacyPolicyViewProps> = ({ onBack }) => {
  return (
    <div className="pb-32 pt-32 md:pt-40 px-4 max-w-6xl mx-auto animate-in fade-in duration-500 transition-colors relative">
      <SEO 
          title="Kebijakan Privasi - Nongkrongr"
          description="Kebijakan privasi dan ketentuan penggunaan platform Nongkrongr."
      />

      {/* Background Elements similar to other views */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
          <div className="absolute top-[10%] left-[-10%] w-[500px] h-[500px] bg-blue-200/20 dark:bg-blue-900/10 rounded-full blur-[120px] animate-pulse-fast opacity-60"></div>
          <div className="absolute bottom-[20%] right-[-10%] w-[600px] h-[600px] bg-orange-200/20 dark:bg-orange-900/10 rounded-full blur-[100px] opacity-60"></div>
      </div>

      <button onClick={onBack} className="flex items-center gap-2 w-fit px-4 py-2 rounded-full bg-white dark:bg-slate-800 shadow-md text-gray-700 dark:text-gray-200 mb-6 hover:text-primary transition-all z-10">
        <ArrowLeft size={20} /> <span className="font-bold text-sm">Kembali</span>
      </button>

      <div className="flex flex-col items-center mb-10 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
            <ShieldCheck size={40} />
        </div>
        <h1 className="text-3xl md:text-4xl font-display font-bold text-gray-800 dark:text-gray-100 mb-2">
            Kebijakan Privasi
        </h1>
        <p className="text-gray-500 dark:text-gray-400 max-w-2xl">
            Kami menghargai privasi Anda. Halaman ini menjelaskan bagaimana Nongkrongr mengumpulkan, menggunakan, dan melindungi data Anda.
        </p>
        <p className="text-xs text-gray-400 mt-2">Terakhir diperbarui: 25 Oktober 2023</p>
      </div>

      <div className="space-y-6">
          <GlassCard className="!bg-white dark:!bg-[#1E293B] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                  <FileText className="text-primary" size={24}/>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Pengumpulan Informasi</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base mb-4">
                  Saat Anda menggunakan Nongkrongr, kami mungkin mengumpulkan informasi yang Anda berikan secara sukarela, seperti:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm md:text-base space-y-2 ml-2">
                  <li>Informasi profil (Nama, Username, Email, Foto Profil) saat mendaftar.</li>
                  <li>Ulasan, komentar, dan konten yang Anda posting di platform.</li>
                  <li>Lokasi (Geo-location) jika Anda mengizinkan akses untuk fitur peta dan rekomendasi terdekat.</li>
              </ul>
          </GlassCard>

          <GlassCard className="!bg-white dark:!bg-[#1E293B] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                  <Eye className="text-blue-500" size={24}/>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Penggunaan Informasi</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base mb-4">
                  Data yang kami kumpulkan digunakan untuk:
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 text-sm md:text-base space-y-2 ml-2">
                  <li>Memberikan layanan rekomendasi kafe yang personal.</li>
                  <li>Memungkinkan interaksi sosial antar pengguna (ulasan, like, profil).</li>
                  <li>Meningkatkan kinerja aplikasi dan pengembangan fitur baru.</li>
                  <li>Mengirimkan notifikasi penting terkait akun atau pembaruan layanan.</li>
              </ul>
          </GlassCard>

          <GlassCard className="!bg-white dark:!bg-[#1E293B] p-6 md:p-8">
              <div className="flex items-center gap-3 mb-4">
                  <Lock className="text-green-500" size={24}/>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Keamanan Data</h2>
              </div>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
                  Kami menerapkan langkah-langkah keamanan teknis untuk melindungi data Anda dari akses yang tidak sah. Password akun Anda disimpan dalam bentuk terenkripsi. Kami tidak akan menjual data pribadi Anda kepada pihak ketiga untuk tujuan pemasaran tanpa persetujuan Anda.
              </p>
          </GlassCard>

          <div className="text-center pt-8 pb-4">
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                  Jika Anda memiliki pertanyaan tentang kebijakan ini, silakan hubungi kami.
              </p>
              <Button onClick={() => window.location.href = "mailto:support@nongkrongr.com"}>
                  Hubungi Support
              </Button>
          </div>
      </div>
    </div>
  );
};
