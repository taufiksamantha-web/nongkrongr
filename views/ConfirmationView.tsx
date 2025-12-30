
import React, { useEffect, useState } from 'react';
import { PartyPopper, Rocket, Loader2, CheckCircle2, Store, ExternalLink } from 'lucide-react';
import { Button } from '../components/UI';
import { useSession } from '../components/SessionContext';

interface ConfirmationViewProps {
  onComplete: () => void;
}

export const ConfirmationView: React.FC<ConfirmationViewProps> = ({ onComplete }) => {
  const { user, isSessionLoading } = useSession();
  const [statusStep, setStatusStep] = useState(0); // 0: Verifying, 1: Ready
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!isSessionLoading && user) {
        setStatusStep(1);

        // LOGIC GUARD: Jika user adalah CAFE_MANAGER, arahkan ke Dashboard Partner
        if (user.role === 'CAFE_MANAGER' || user.role === 'ADMIN') {
            setIsRedirecting(true);
            const timer = setTimeout(() => {
                window.location.href = 'https://dashboard.nongkrongr.com';
            }, 3000); // Beri jeda 3 detik agar user bisa membaca pesan sukses
            return () => clearTimeout(timer);
        }
    }
  }, [user, isSessionLoading]);

  const isPartner = user?.role === 'CAFE_MANAGER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-orange-400 to-red-600 text-white relative overflow-hidden px-4">
      
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-white/20 rounded-full blur-[80px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-yellow-400/20 rounded-full blur-[100px] animate-pulse"></div>
      
      <div className="relative z-10 text-center max-w-md w-full animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl animate-bounce">
            {isPartner ? (
                <Store size={48} className="text-orange-500" />
            ) : (
                <PartyPopper size={48} className="text-orange-500" />
            )}
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold mb-4 drop-shadow-md leading-tight">
           {statusStep === 1 ? 'Verifikasi Berhasil!' : 'Memproses Verifikasi...'}
        </h1>
        
        <p className="text-lg text-white/90 mb-8 leading-relaxed font-medium">
           {statusStep === 1 
             ? (isPartner 
                ? 'Email Partner terkonfirmasi. Akun Anda sedang dalam peninjauan admin.' 
                : 'Email terkonfirmasi. Yuk, langsung cari tempat nongkrong asik!') 
             : 'Sebentar ya, kami sedang memvalidasi akun kamu...'}
        </p>

        {/* Status Box */}
        <div className="bg-white/10 backdrop-blur-md rounded-[2rem] p-6 border border-white/20 mb-8 shadow-lg text-left space-y-4">
            <div className="flex items-center gap-3">
                <div className="p-1 bg-green-400 rounded-full text-white shadow-sm"><CheckCircle2 size={16} /></div>
                <span className="text-sm font-bold opacity-90">Email Terverifikasi</span>
            </div>
            
            {isPartner ? (
                <div className="flex items-center gap-3 animate-in fade-in duration-700">
                    <div className="p-1 bg-blue-400 rounded-full text-white shadow-sm"><CheckCircle2 size={16} /></div>
                    <span className="text-sm font-bold opacity-90">Role Partner Terdeteksi</span>
                </div>
            ) : (
                <div className="flex items-center gap-3">
                    {statusStep >= 1 ? (
                        <div className="p-1 bg-green-400 rounded-full text-white shadow-sm animate-in zoom-in"><CheckCircle2 size={16} /></div>
                    ) : (
                        <div className="p-1 bg-white/20 rounded-full text-white animate-spin"><Loader2 size={16} /></div>
                    )}
                    <span className={`text-sm font-bold ${statusStep >= 1 ? 'opacity-90' : 'opacity-60'}`}>
                        Menyiapkan Profil Kamu
                    </span>
                </div>
            )}
        </div>

        {isPartner ? (
            <div className="space-y-4">
                <div className="bg-white text-orange-600 p-4 rounded-2xl font-bold flex items-center justify-center gap-3 animate-pulse">
                    <Loader2 className="animate-spin" size={20} />
                    Mengalihkan ke Dashboard...
                </div>
                <Button 
                    onClick={() => window.location.href = 'https://dashboard.nongkrongr.com'}
                    className="w-full py-4 bg-transparent border-2 border-white text-white hover:bg-white/10 font-bold text-lg rounded-2xl transition-all"
                >
                    Buka Manual <ExternalLink size={20} className="ml-2" />
                </Button>
            </div>
        ) : (
            <Button 
                onClick={onComplete}
                disabled={statusStep < 1}
                className={`w-full py-4 bg-white text-orange-600 hover:bg-gray-50 font-bold text-lg shadow-xl transition-all group ${statusStep < 1 ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl hover:scale-105'} rounded-2xl`}
            >
                {statusStep < 1 ? 'Memuat...' : 'Mulai Eksplorasi'} 
                {statusStep >= 1 && <Rocket size={20} className="ml-2 group-hover:translate-x-1 transition-transform" />}
            </Button>
        )}
      </div>
    </div>
  );
};
