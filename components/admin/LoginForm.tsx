
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/solid';

type FormMode = 'login' | 'signup' | 'forgot';

const LoginForm: React.FC = () => {
    const { login, signup, resetPasswordForEmail } = useAuth();
    const navigate = useNavigate();
    const [mode, setMode] = useState<FormMode>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isCafeAdmin, setIsCafeAdmin] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    
    const loginInputRef = useRef<HTMLInputElement>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setError('');
        setSuccessMessage('');
        
        if (mode === 'signup') {
             setUsername('');
             setEmail('');
             setPassword('');
             setConfirmPassword('');
             setShowPassword(false);
             setTimeout(() => usernameInputRef.current?.focus(), 100);
        } else if (mode === 'login') {
             setShowPassword(false);
             // Focus on login input when switching to login
             setTimeout(() => loginInputRef.current?.focus(), 100);
        } else if (mode === 'forgot') {
            setEmail('');
        }
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (mode === 'forgot') {
            if (!email.trim()) {
                setError("Email wajib diisi.");
                setLoading(false);
                return;
            }
            const { error: resetError } = await resetPasswordForEmail(email.trim());
            if (resetError) {
                setError(resetError.message);
            } else {
                setSuccessMessage('Link reset password telah dikirim ke email Anda. Silakan cek kotak masuk (atau spam).');
            }
        } else if (mode === 'signup') {
            if (password.length < 6) {
                setError("Password minimal 6 karakter.");
                setLoading(false);
                return;
            }
            if (password !== confirmPassword) {
                setError("Password dan konfirmasi password tidak cocok.");
                setLoading(false);
                return;
            }
            if (username.length < 3) {
                setError("Username minimal 3 karakter.");
                setLoading(false);
                return;
            }
            
            // Normalize input to lowercase
            const safeUsername = username.trim().toLowerCase();
            const safeEmail = email.trim().toLowerCase();

            const { error: authError } = await signup(safeUsername, safeEmail, password, isCafeAdmin);
            
            if (authError) {
                 if (authError.message.includes('already registered') || authError.message.includes('sudah terdaftar')) {
                     setError('Email sudah terdaftar. Silakan login.');
                 } else if (authError.message.includes('Username')) {
                     setError(authError.message);
                 } else {
                     setError('Gagal mendaftar. Silakan coba lagi.');
                 }
            } else {
                if (isCafeAdmin) {
                    setSuccessMessage('Pendaftaran sebagai pengelola berhasil! Akun Anda akan aktif setelah disetujui oleh admin. Silakan Login.');
                } else {
                    setSuccessMessage('Pendaftaran berhasil! Silakan login untuk melanjutkan.');
                }
                
                setMode('login');
                setIsCafeAdmin(false);
                setPassword('');
                setConfirmPassword('');
            }
        } else {
            // LOGIN MODE
            const safeIdentifier = email.trim().toLowerCase();
            const { error: authError } = await login(safeIdentifier, password);
            if (authError) {
                setError(authError.message || 'Username/email atau password salah.');
            } else {
                navigate('/');
            }
        }
        setLoading(false);
    };

    return (
        <div className="max-w-md mx-auto mt-12 md:mt-20 px-4 w-full">
            <Link to="/" className="flex justify-center mb-8">
                <img src="https://res.cloudinary.com/dovouihq8/image/upload/logo.png" alt="Nongkrongr Logo" className="h-12 w-auto" />
            </Link>
            <div className="bg-card p-8 rounded-3xl shadow-lg border border-border">
                {mode !== 'forgot' && (
                    <div className="flex bg-soft dark:bg-gray-700/50 p-1 rounded-xl mb-6">
                        <button 
                            onClick={() => setMode('login')}
                            className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'login' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            Login
                        </button>
                        <button 
                            onClick={() => setMode('signup')}
                            className={`w-1/2 py-2 text-sm font-bold rounded-lg transition-colors ${mode === 'signup' ? 'bg-brand text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                        >
                            Daftar
                        </button>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {mode === 'forgot' && (
                        <button type="button" onClick={() => setMode('login')} className="flex items-center gap-1 text-sm text-muted hover:text-brand mb-2">
                            <ArrowLeftIcon className="h-4 w-4"/> Kembali ke Login
                        </button>
                    )}

                    <h1 className="text-2xl sm:text-3xl font-bold font-jakarta text-center whitespace-nowrap">
                        {mode === 'login' ? 'Selamat Datang Kembali' : mode === 'signup' ? 'Buat Akun Baru' : 'Lupa Password?'}
                    </h1>
                    
                    {mode === 'forgot' && !successMessage && (
                        <p className="text-muted text-center text-sm">Masukkan email Anda, kami akan mengirimkan link untuk mereset password.</p>
                    )}
                    
                    {error && (
                        <div className="bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 p-3 rounded-xl text-center text-sm font-semibold animate-fade-in-up">
                            {error}
                        </div>
                    )}
                    
                    {successMessage && (
                        <div className="bg-green-100 dark:bg-green-500/20 border border-green-200 dark:border-green-900 text-green-700 dark:text-green-200 p-3 rounded-xl text-center text-sm font-semibold animate-fade-in-up">
                            {successMessage}
                        </div>
                    )}
                    
                    <div key={mode} className="space-y-6 animate-fade-in-up" style={{animationDuration: '0.4s'}}>
                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="username" className="font-semibold">Username</label>
                                <input
                                    id="username"
                                    ref={usernameInputRef}
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                    required
                                    placeholder="Buat username unik"
                                />
                            </div>
                        )}
                        <div>
                            <label htmlFor="email" className="font-semibold">{mode === 'login' ? 'Email atau Username' : 'Email'}</label>
                            <input
                                id="email"
                                ref={loginInputRef}
                                type={mode === 'login' ? 'text' : 'email'}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                required
                                placeholder={mode === 'login' ? 'Masukkan email atau username' : 'Masukkan email aktif'}
                            />
                        </div>
                        {mode !== 'forgot' && (
                            <div>
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="font-semibold">Password</label>
                                    {mode === 'login' && (
                                        <button type="button" onClick={() => setMode('forgot')} className="text-xs text-brand font-bold hover:underline">Lupa password?</button>
                                    )}
                                </div>
                                <div className="relative mt-2">
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="w-full p-3 pr-10 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                        required
                                        placeholder={mode === 'login' ? 'Masukkan password' : 'Password (minimal 6 karakter)'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-brand focus:outline-none"
                                        aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                                    >
                                        {showPassword ? (
                                            <EyeSlashIcon className="h-5 w-5" />
                                        ) : (
                                            <EyeIcon className="h-5 w-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="confirmPassword" className="font-semibold">Konfirmasi Password</label>
                                <div className="relative mt-2">
                                    <input
                                        id="confirmPassword"
                                        type={showPassword ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full p-3 pr-10 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                        required
                                        placeholder="Konfirmasi password"
                                    />
                                </div>
                            </div>
                        )}

                        {mode === 'signup' && (
                            <div className="flex items-center gap-3 p-3 bg-soft dark:bg-gray-700/50 rounded-xl border border-border">
                                <input
                                    id="isCafeAdmin"
                                    type="checkbox"
                                    checked={isCafeAdmin}
                                    onChange={(e) => setIsCafeAdmin(e.target.checked)}
                                    className="h-5 w-5 rounded text-brand focus:ring-brand border-gray-400"
                                />
                                <label htmlFor="isCafeAdmin" className="font-semibold text-primary cursor-pointer">Daftar sebagai Pengelola Kafe</label>
                            </div>
                        )}
                    </div>

                    <button type="submit" className="w-full bg-brand text-white font-bold py-3 rounded-2xl text-lg hover:bg-brand/90 transition-all disabled:bg-brand/50" disabled={loading}>
                        {loading ? 'Memproses...' : (mode === 'login' ? 'Login' : mode === 'signup' ? 'Daftar' : 'Kirim Link Reset')}
                    </button>
                    <div className="text-center pt-2">
                        <Link to="/" className="text-sm text-muted hover:text-brand transition-colors duration-300">
                            &larr; Kembali ke Home
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default LoginForm;
