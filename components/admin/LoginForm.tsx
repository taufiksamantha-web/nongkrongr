
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

type FormMode = 'login' | 'signup';

const LoginForm: React.FC = () => {
    const { login, signup } = useAuth();
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
    
    const loginInputRef = useRef<HTMLInputElement>(null);
    const usernameInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setError('');
        
        if (mode === 'signup') {
            setSuccessMessage('');
             // Clear fields when entering signup mode for fresh start
             setUsername('');
             setEmail('');
             setPassword('');
             setConfirmPassword('');
             // Focus on username input when switching to signup
             setTimeout(() => usernameInputRef.current?.focus(), 100);
        } else {
             // When switching to login manually
             if (!successMessage) {
                 setUsername('');
                 setEmail('');
                 setPassword('');
             }
             // Focus on login input (email/username) when switching to login
             setTimeout(() => loginInputRef.current?.focus(), 100);
        }
    }, [mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        if (mode === 'signup') {
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
                 // Handle specific error messages from Supabase/Context
                 if (authError.message.includes('already registered') || authError.message.includes('sudah terdaftar')) {
                     setError('Email sudah terdaftar. Silakan login.');
                 } else if (authError.message.includes('Username')) {
                     setError(authError.message);
                 } else {
                     setError('Gagal mendaftar. Silakan coba lagi.');
                 }
            } else {
                // Registration Successful
                if (isCafeAdmin) {
                    setSuccessMessage('Pendaftaran sebagai pengelola berhasil! Akun Anda akan aktif setelah disetujui oleh admin. Silakan Login.');
                } else {
                    setSuccessMessage('Pendaftaran berhasil! Silakan login untuk melanjutkan.');
                }
                
                // Switch to login mode
                setMode('login');
                setIsCafeAdmin(false);
                // Clear sensitive fields
                setPassword('');
                setConfirmPassword('');
            }
        } else {
            // LOGIN MODE
            // 'email' state here holds either username or email. Normalize to lowercase.
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
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <h1 className="text-2xl sm:text-3xl font-bold font-jakarta text-center whitespace-nowrap">
                        {mode === 'login' ? 'Selamat Datang Kembali' : 'Buat Akun Baru'}
                    </h1>
                    
                    {error && (
                        <div className="bg-red-100 dark:bg-red-500/20 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-200 p-3 rounded-xl text-center text-sm font-semibold animate-fade-in-up">
                            {error}
                        </div>
                    )}
                    
                    {successMessage && mode === 'login' && (
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
                        <div>
                            <label htmlFor="password" className="font-semibold">Password</label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                required
                                placeholder={mode === 'login' ? 'Masukkan password' : 'Password (minimal 6 karakter)'}
                            />
                        </div>

                        {mode === 'signup' && (
                            <div>
                                <label htmlFor="confirmPassword" className="font-semibold">Konfirmasi Password</label>
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="mt-2 w-full p-3 border border-border bg-soft dark:bg-gray-700/50 rounded-xl text-primary dark:text-white"
                                    required
                                    placeholder="Konfirmasi password"
                                />
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
                        {loading ? 'Memproses...' : (mode === 'login' ? 'Login' : 'Daftar')}
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
