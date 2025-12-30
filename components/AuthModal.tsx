import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Store, Mail, Lock, Eye, EyeOff, X, AlertTriangle, CheckCircle, AtSign, ChevronLeft, ExternalLink, Rocket, ShieldCheck, Clock, MailCheck, Loader2 } from 'lucide-react';
import { Button, Input } from './UI';
import { registerUser, loginUser, sendPasswordResetEmail, updateUserPassword, signOutUser, ensureUserProfile } from '../services/dataService';
import { useSession } from './SessionContext';

interface AuthModalProps {
    onClose: () => void;
    onSuccess: () => void;
    initialView?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'UPDATE_PASSWORD';
}

export const AuthModal: React.FC<AuthModalProps> = ({ onClose, onSuccess, initialView = 'LOGIN' }) => {
    const { setUser } = useSession(); 
    
    const [view, setView] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'UPDATE_PASSWORD' | 'PARTNER_INFO'>(initialView);
    const [regRole, setRegRole] = useState<'USER' | 'CAFE_MANAGER'>('USER');
    
    const [form, setForm] = useState({ 
        name: '', 
        username: '', 
        identifier: '', 
        email: '',      
        password: '', 
        confirmPassword: '' 
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [showPass, setShowPass] = useState(false);

    const identifierRef = useRef<HTMLInputElement>(null);
    const nameRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            if ((view === 'LOGIN' || view === 'FORGOT_PASSWORD') && identifierRef.current) {
                identifierRef.current.focus();
            } else if (view === 'REGISTER' && nameRef.current) {
                nameRef.current.focus();
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [view]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setSuccessMsg(null);

        try {
            if (view === 'REGISTER') {
                if (!form.name || !form.username || !form.email || !form.password || !form.confirmPassword) {
                    throw new Error("Semua kolom wajib diisi.");
                }
                if (form.password !== form.confirmPassword) {
                    throw new Error("Konfirmasi password tidak cocok.");
                }
                
                await registerUser(form.email, form.password, { 
                    name: form.name, 
                    username: form.username,
                    role: regRole 
                });
                
                if (regRole === 'CAFE_MANAGER') {
                    setView('PARTNER_INFO');
                } else {
                    setView('LOGIN');
                    setSuccessMsg("Pendaftaran Berhasil! 📧 Silakan verifikasi email Anda sebelum masuk.");
                }
            } 
            else if (view === 'FORGOT_PASSWORD') {
                if (!form.email) throw new Error("Email wajib diisi.");
                await sendPasswordResetEmail(form.email);
                setSuccessMsg("Instruksi reset password telah dikirim ke email Anda.");
            } 
            else if (view === 'UPDATE_PASSWORD') {
                if (!form.password || !form.confirmPassword) throw new Error("Password wajib diisi.");
                if (form.password !== form.confirmPassword) throw new Error("Konfirmasi password tidak cocok.");
                await updateUserPassword(form.password);
                setSuccessMsg("Password berhasil diperbarui! Silakan login kembali.");
                setTimeout(() => setView('LOGIN'), 2000);
            }
            else {
                const authData = await loginUser(form.identifier, form.password); 
                if (authData?.data?.user) {
                    const profile = await ensureUserProfile(authData.data.user);
                    if (profile && (profile.role === 'ADMIN' || profile.role === 'CAFE_MANAGER')) {
                        await signOutUser();
                        setView('PARTNER_INFO');
                        return;
                    }
                    if (profile) setUser(profile);
                } else if (authData?.error) {
                    throw authData.error;
                }
                onSuccess();
            }
        } catch (err: any) {
            setError(err.message || "Terjadi kesalahan. Pastikan kredensial benar.");
        } finally {
            setIsLoading(false);
        }
    };

    if (view === 'PARTNER_INFO') {
        return (
            <div className="fixed inset-0 z-[99950] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                <div className="w-full h-full md:h-auto md:max-h-[95vh] md:max-w-md bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden relative animate-in zoom-in duration-300 flex flex-col">
                    <button onClick={onClose} className="absolute top-4 right-4 z-20 p-2 bg-gray-100 dark:bg-slate-800 text-gray-500 rounded-full hover:bg-red-500 hover:text-white transition-all"><X size={20}/></button>
                    
                    <div className="p-8 md:p-10 text-center flex flex-col items-center flex-1 overflow-y-auto custom-scrollbar">
                        <div className="w-24 h-24 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-8 relative shrink-0">
                            <div className="absolute inset-0 rounded-full border-4 border-orange-500 border-t-transparent animate-spin"></div>
                            <Store size={48} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        
                        <h2 className="text-3xl font-display font-black text-gray-900 dark:text-white mb-4 leading-tight">Pendaftaran Berhasil! 🚀</h2>
                        
                        <p className="text-gray-500 dark:text-gray-400 mb-8 leading-relaxed text-sm">
                            Halo Partner! Akun Anda sedang disiapkan. Ikuti langkah berikut untuk mulai mengelola kafe Anda:
                        </p>

                        <div className="w-full space-y-4 mb-10">
                            <div className="flex gap-4 items-start text-left p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-orange-500 shadow-sm shrink-0 font-black">1</div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        Verifikasi Email <MailCheck size={14} className="text-blue-500"/>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Cek inbox atau spam email Anda dan klik link verifikasi yang kami kirimkan.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start text-left p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30">
                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-blue-500 shadow-sm shrink-0 font-black">2</div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                        Persetujuan Admin <Clock size={14} className="text-orange-500"/>
                                    </p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Tim kami akan meninjau pendaftaran Anda dalam 1x24 jam setelah email terverifikasi.
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-4 items-start text-left p-4 rounded-2xl bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 opacity-60">
                                <div className="w-10 h-10 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center text-green-500 shadow-sm shrink-0 font-black">3</div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900 dark:text-white">Akses Dashboard</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                        Setelah disetujui, Anda dapat masuk ke platform manajemen partner.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full py-4 rounded-2xl text-lg shadow-xl shrink-0" onClick={() => window.open('https://dashboard.nongkrongr.com', '_blank')}>
                            Cek Dashboard Partner
                        </Button>
                        
                        <button onClick={() => setView('LOGIN')} className="mt-8 mb-4 text-sm font-bold text-gray-400 hover:text-orange-500 transition-colors shrink-0">
                            Kembali ke Login User
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[99950] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
            <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-md bg-white dark:bg-slate-900 md:rounded-3xl shadow-2xl overflow-hidden relative overflow-y-auto animate-in slide-in-from-bottom-4 duration-300 flex flex-col">
                {/* LOGIN LOADING OVERLAY */}
                {isLoading && (
                    <div className="absolute inset-0 z-[100] bg-white/70 dark:bg-slate-900/70 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-200">
                        <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-[1.5rem] flex items-center justify-center shadow-2xl border border-gray-100 dark:border-slate-700">
                            <Loader2 className="animate-spin text-orange-500" size={32} />
                        </div>
                        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.2em] text-orange-600 animate-pulse">Menghubungkan Akun...</p>
                    </div>
                )}

                <button onClick={onClose} className="absolute top-[calc(1rem+env(safe-area-inset-top))] right-4 z-20 p-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur text-gray-500 rounded-full shadow-md hover:scale-110 transition-transform active:scale-95"><X size={24} /></button>
                
                <div className="bg-gradient-to-br from-orange-500 to-red-600 p-8 pt-12 md:pt-8 text-center text-white relative overflow-hidden shrink-0">
                    <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
                    <h2 className="text-2xl font-bold font-display relative z-10">
                        {view === 'LOGIN' ? 'Masuk ke Nongkrongr' : 
                         view === 'FORGOT_PASSWORD' ? 'Lupa Kata Sandi' :
                         view === 'UPDATE_PASSWORD' ? 'Ganti Kata Sandi' :
                         'Daftar Akun Baru'}
                    </h2>
                    <p className="text-sm text-white/80 mt-1 relative z-10">
                        {view === 'LOGIN' ? 'Lanjutkan petualangan kopimu' : 
                         view === 'FORGOT_PASSWORD' ? 'Masukkan email pemulihan' :
                         view === 'UPDATE_PASSWORD' ? 'Siapkan password baru kamu' :
                         'Bergabung dengan komunitas kami'}
                    </p>
                </div>

                <div className="p-8 flex-1">
                    {(view === 'LOGIN' || view === 'REGISTER') && (
                        <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
                            <button onClick={() => setView('LOGIN')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${view === 'LOGIN' ? 'bg-white dark:bg-slate-700 shadow text-orange-600' : 'text-gray-500'}`}>Masuk</button>
                            <button onClick={() => setView('REGISTER')} className={`flex-1 py-3 text-sm font-bold rounded-lg transition-all ${view === 'REGISTER' ? 'bg-white dark:bg-slate-700 shadow text-orange-600' : 'text-gray-500'}`}>Daftar</button>
                        </div>
                    )}

                    {view === 'REGISTER' && (
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            <button onClick={() => setRegRole('USER')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${regRole === 'USER' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-gray-100 dark:border-slate-800 text-gray-400'}`}>
                                <UserIcon size={24} /><span className="text-[10px] font-bold uppercase">Pencari Kafe</span>
                            </button>
                            <button onClick={() => setRegRole('CAFE_MANAGER')} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${regRole === 'CAFE_MANAGER' ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20 text-orange-600' : 'border-gray-100 dark:border-slate-800 text-gray-400'}`}>
                                <Store size={24} /><span className="text-[10px] font-bold uppercase">Pemilik Kafe</span>
                            </button>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs flex gap-2 items-center mb-4 border border-red-200">
                            <AlertTriangle size={16} className="shrink-0"/> {error}
                        </div>
                    )}

                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm flex gap-3 items-start mb-4 border border-green-200">
                            <CheckCircle size={20} className="shrink-0 mt-0.5"/> <div>{successMsg}</div>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'REGISTER' && (
                            <>
                                <Input name="name" placeholder="Nama Lengkap" value={form.name} onChange={handleChange} required icon={UserIcon} className="py-3.5" ref={nameRef} />
                                <Input name="username" placeholder="Username" value={form.username} onChange={handleChange} required icon={AtSign} className="py-3.5" />
                                <Input name="email" type="email" placeholder="Alamat Email" value={form.email} onChange={handleChange} required icon={Mail} className="py-3.5" />
                            </>
                        )}
                        
                        {view === 'FORGOT_PASSWORD' && (
                            <Input name="email" type="email" placeholder="Alamat Email" value={form.email} onChange={handleChange} required icon={Mail} className="py-3.5" ref={identifierRef} />
                        )}

                        {view === 'LOGIN' && (
                            <Input name="identifier" placeholder="Username atau Email" value={form.identifier} onChange={handleChange} required icon={UserIcon} className="py-3.5" ref={identifierRef} />
                        )}

                        {view !== 'FORGOT_PASSWORD' && (
                            <div className="relative">
                                <Input name="password" type={showPass ? "text" : "password"} placeholder={view === 'UPDATE_PASSWORD' ? "Password Baru" : "Kata Sandi"} value={form.password} onChange={handleChange} required icon={Lock} className="py-3.5" />
                                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        )}

                        {(view === 'REGISTER' || view === 'UPDATE_PASSWORD') && (
                             <Input name="confirmPassword" type="password" placeholder="Konfirmasi Kata Sandi" value={form.confirmPassword} onChange={handleChange} required icon={Lock} className="py-3.5" />
                        )}

                        <Button className="w-full mt-4 py-4 text-base" disabled={isLoading}>
                            {isLoading ? 'Memproses...' : 
                             view === 'LOGIN' ? 'Masuk Sekarang' : 
                             view === 'FORGOT_PASSWORD' ? 'Kirim Link Reset' :
                             view === 'UPDATE_PASSWORD' ? 'Perbarui Password' :
                             ('Daftar Sebagai ' + (regRole === 'USER' ? 'User' : 'Partner'))}
                        </Button>
                        
                        {view === 'LOGIN' && (
                            <button type="button" onClick={() => setView('FORGOT_PASSWORD')} className="w-full text-center text-xs font-bold text-gray-400 hover:text-orange-500 mt-2">
                                Lupa kata sandi?
                            </button>
                        )}
                        {(view === 'FORGOT_PASSWORD' || view === 'UPDATE_PASSWORD') && (
                            <button type="button" onClick={() => setView('LOGIN')} className="w-full text-center text-xs font-bold text-gray-400 hover:text-orange-500 mt-2">
                                Kembali ke Login
                            </button>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};